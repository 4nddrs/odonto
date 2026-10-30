import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { disposeObject, loadGLTF } from './toothLoader'

const GUM = 0xc79a8c
const BONE = 0xe9dac4
const TOOTH = 0xefe0c6

interface Options {
  onPick: (fdi: number) => void
  onLoading?: (loading: boolean) => void
}

interface Slot {
  fdi: number
  meshes: THREE.Mesh[]
}

export class MouthScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly host: HTMLElement
  private readonly observer: ResizeObserver
  private readonly raycaster = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2(-10, -10)
  private readonly toothMaterial: THREE.MeshPhysicalMaterial
  private readonly onPick: (fdi: number) => void
  private readonly onLoading?: (loading: boolean) => void

  private root: THREE.Group | null = null
  private toothMaterials: THREE.MeshPhysicalMaterial[] = []
  private theme: 'dark' | 'light' = 'dark'
  private gumMaterial: THREE.MeshStandardMaterial | null = null
  private boneMaterial: THREE.MeshStandardMaterial | null = null
  private slots: Slot[] = []
  private hovered: Slot | null = null
  private frame = 0
  private active = true
  private disposed = false
  private pointerDown: { x: number; y: number } | null = null
  private resumeTimer: ReturnType<typeof setTimeout> | undefined

  constructor(private readonly canvas: HTMLCanvasElement, options: Options) {
    this.host = canvas.parentElement ?? canvas
    this.onPick = options.onPick
    this.onLoading = options.onLoading

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 0.96
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 500)
    this.camera.position.set(0, 3, 20)

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.08
    this.controls.enablePan = false
    this.controls.rotateSpeed = 0.6
    this.controls.minPolarAngle = Math.PI * 0.18
    this.controls.maxPolarAngle = Math.PI * 0.72
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.2
    this.controls.addEventListener('start', this.pauseAutoRotate)

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture
    pmrem.dispose()

    this.toothMaterial = new THREE.MeshPhysicalMaterial({
      color: TOOTH,
      roughness: 0.42,
      metalness: 0,
      clearcoat: 0.4,
      clearcoatRoughness: 0.35,
      envMapIntensity: 0.9,
    })

    const key = new THREE.DirectionalLight(0xfff0dc, 1.5)
    key.position.set(8, 14, 16)
    this.scene.add(key)

    const fill = new THREE.DirectionalLight(0xffe4cc, 0.5)
    fill.position.set(-14, 4, 10)
    this.scene.add(fill)

    const rim = new THREE.DirectionalLight(0xffffff, 1.1)
    rim.position.set(-4, -8, -14)
    this.scene.add(rim)

    this.scene.add(new THREE.AmbientLight(0xfff6ec, 0.35))

    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(this.host)
    this.resize()

    canvas.addEventListener('pointermove', this.handlePointerMove)
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    canvas.addEventListener('pointerleave', this.handlePointerLeave)

    void this.load()
    this.frame = requestAnimationFrame(this.tick)
  }

  private async load(): Promise<void> {
    this.onLoading?.(true)
    try {
      const gltf = await loadGLTF(`${import.meta.env.BASE_URL}models/core.glb`)
      if (this.disposed) {
        disposeObject(gltf.scene)
        return
      }

      const root = new THREE.Group()
      const gumMaterial = new THREE.MeshStandardMaterial({ color: GUM, roughness: 0.68, envMapIntensity: 0.5 })
      const boneMaterial = new THREE.MeshStandardMaterial({ color: BONE, roughness: 0.82, envMapIntensity: 0.35 })
      this.gumMaterial = gumMaterial
      this.boneMaterial = boneMaterial

      gltf.scene.updateMatrixWorld(true)
      const nodes = [...gltf.scene.children]

      for (const node of nodes) {
        const name = node.name.toLowerCase()
        const isGum = name.startsWith('gingiva')
        const match = /^tooth-(\d+)$/.exec(name)
        if (match) {
          const fdi = Number(match[1])
          const material = this.toothMaterial.clone()
          this.toothMaterials.push(material)
          const meshes: THREE.Mesh[] = []
          node.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return
            child.material = material
            meshes.push(child)
          })
          this.slots.push({ fdi, meshes })
        } else {
          node.traverse((child) => {
            if (!(child instanceof THREE.Mesh)) return
            child.material = isGum ? gumMaterial : boneMaterial
          })
        }
        root.attach(node)
      }

      // Frame on the teeth, not on the bone: the arches should fill the stage
      // and the maxilla/mandible can bleed out of frame.
      const box = new THREE.Box3()
      for (const slot of this.slots) {
        for (const mesh of slot.meshes) box.expandByObject(mesh)
      }
      const center = box.getCenter(new THREE.Vector3())
      const size = box.getSize(new THREE.Vector3())

      root.position.sub(center)
      this.scene.add(root)
      this.root = root

      // Fit both axes: on a phone the arch is wider than the viewport.
      const halfFov = Math.tan((this.camera.fov * Math.PI) / 360)
      const distanceY = (size.y * 0.72) / halfFov
      const distanceX = (size.x * 0.62) / (halfFov * Math.max(this.camera.aspect, 0.2))
      const distance = Math.max(distanceY, distanceX)
      this.camera.position.set(0, size.y * 0.02, distance)
      this.controls.target.set(0, 0, 0)
      this.controls.minDistance = distance * 0.55
      this.controls.maxDistance = distance * 1.7
      this.controls.update()
      this.applyTheme()

      this.onLoading?.(false)
    } catch (error) {
      console.error('No se pudo cargar la arcada', error)
      this.onLoading?.(false)
    }
  }

  private handlePointerMove = (event: PointerEvent): void => {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    )
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.pointerDown = { x: event.clientX, y: event.clientY }
  }

  private handlePointerUp = (event: PointerEvent): void => {
    if (!this.pointerDown) return
    const moved = Math.hypot(event.clientX - this.pointerDown.x, event.clientY - this.pointerDown.y)
    this.pointerDown = null
    if (moved > 6) return
    if (this.hovered) this.onPick(this.hovered.fdi)
  }

  private handlePointerLeave = (): void => {
    this.pointer.set(-10, -10)
  }

  private pauseAutoRotate = (): void => {
    this.controls.autoRotate = false
    if (this.resumeTimer) clearTimeout(this.resumeTimer)
    this.resumeTimer = setTimeout(() => {
      if (!this.disposed) this.controls.autoRotate = true
    }, 5000)
  }

  private pick(): void {
    if (!this.root) return
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(
      this.slots.flatMap((slot) => slot.meshes),
      false,
    )
    const hit = hits[0]?.object as THREE.Mesh | undefined
    const next = hit ? (this.slots.find((slot) => slot.meshes.includes(hit)) ?? null) : null
    if (next === this.hovered) return

    if (this.hovered) {
      for (const mesh of this.hovered.meshes) {
        ;(mesh.material as THREE.MeshPhysicalMaterial).emissive.setHex(0x000000)
        ;(mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0
      }
    }
    this.hovered = next
    if (next) {
      for (const mesh of next.meshes) {
        ;(mesh.material as THREE.MeshPhysicalMaterial).emissive.setHex(0xd98a4e)
        ;(mesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.34
      }
    }
    this.canvas.style.cursor = next ? 'pointer' : 'grab'
  }

  private resize(): void {
    const { clientWidth, clientHeight } = this.host
    if (!clientWidth || !clientHeight) return
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(clientWidth, clientHeight, false)
  }

  private tick = (): void => {
    if (this.disposed) return
    this.frame = requestAnimationFrame(this.tick)
    if (!this.active) return

    this.pick()
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  setActive(active: boolean): void {
    this.active = active
  }

  setTheme(theme: 'dark' | 'light'): void {
    this.theme = theme
    this.applyTheme()
  }

  private applyTheme(): void {
    const dark = this.theme === 'dark'
    this.renderer.toneMappingExposure = dark ? 0.68 : 0.96
    for (const material of this.toothMaterials) {
      material.color.setHex(dark ? 0xccb897 : 0xefe0c6)
      material.envMapIntensity = dark ? 0.55 : 0.9
    }
    this.gumMaterial?.color.setHex(dark ? 0x9a6c60 : 0xc79a8c)
    this.boneMaterial?.color.setHex(dark ? 0xb49f85 : 0xe9dac4)
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    if (this.resumeTimer) clearTimeout(this.resumeTimer)
    this.observer.disconnect()
    this.controls.removeEventListener('start', this.pauseAutoRotate)
    this.controls.dispose()
    this.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave)
    if (this.root) {
      this.root.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose()
          ;(child.material as THREE.Material).dispose()
        }
      })
    }
    this.renderer.dispose()
  }
}
