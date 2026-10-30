import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import {
  LAYERS,
  disposeObject,
  loadTooth,
  type LayerId,
  type LayerVisibility,
} from './toothLoader'

export type { LayerId, LayerVisibility }

const CAMERA_HOME = 820
const CAMERA_ENTER = 1180
const CAMERA_EXPLODED = 1420
const TOOTH_HEIGHT = 420

const OFFSETS: Record<LayerId, { x: number; z: number }> = {
  enamel: { x: -260, z: -24 },
  dentin: { x: -130, z: -8 },
  pulp: { x: 0, z: 0 },
  cement: { x: 130, z: 8 },
  pdl: { x: 260, z: 24 },
}

const ALPHA_BASE: Record<LayerId, number> = {
  enamel: 0.38,
  dentin: 1,
  pulp: 1,
  cement: 1,
  pdl: 0.75,
}

const ALPHA_EXPLODED: Record<LayerId, number> = {
  enamel: 0.95,
  dentin: 1,
  pulp: 1,
  cement: 1,
  pdl: 1,
}

interface Options {
  onLoading?: (loading: boolean) => void
}

export class ToothScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly controls: OrbitControls
  private readonly host: HTMLElement
  private readonly materials: Record<LayerId, THREE.MeshStandardMaterial>
  private readonly pivots = {} as Record<LayerId, THREE.Group>
  private readonly visible: LayerId[] = ['enamel', 'dentin', 'pulp', 'cement']
  private readonly alpha: Record<LayerId, number> = { ...ALPHA_BASE, pdl: 0 }
  private enamelAlpha = 0.38
  private readonly observer: ResizeObserver
  private readonly onLoading?: (loading: boolean) => void

  private toothRoot: THREE.Group | null = null
  private currentFdi = -1
  private loadToken = 0
  private frame = 0
  private lastTime = performance.now()
  private readonly startedAt = performance.now()
  private camT = 1
  private camGoal = CAMERA_HOME
  private camAnimating = false
  private explode = 0
  private targetExplode = 0
  private resumeTimer: ReturnType<typeof setTimeout> | undefined
  private disposed = false

  constructor(private readonly canvas: HTMLCanvasElement, options: Options = {}) {
    this.host = canvas.parentElement ?? canvas
    this.onLoading = options.onLoading

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    this.camera = new THREE.PerspectiveCamera(34, 1, 1, 6000)
    this.camera.position.set(0, 0, CAMERA_ENTER)

    this.controls = new OrbitControls(this.camera, this.canvas)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.07
    this.controls.enablePan = false
    this.controls.minDistance = 400
    this.controls.maxDistance = 1800
    this.controls.rotateSpeed = 0.65
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.45
    this.controls.addEventListener('start', this.pauseAutoRotate)

    const pmrem = new THREE.PMREMGenerator(this.renderer)
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.05).texture
    pmrem.dispose()

    this.materials = {
      enamel: new THREE.MeshPhysicalMaterial({
        color: 0xfff6e6,
        roughness: 0.12,
        metalness: 0,
        clearcoat: 1,
        clearcoatRoughness: 0.18,
        transparent: true,
        opacity: ALPHA_BASE.enamel,
        depthWrite: false,
        envMapIntensity: 1.2,
      }),
      dentin: new THREE.MeshStandardMaterial({
        color: 0xe0b985,
        roughness: 0.74,
        metalness: 0,
        transparent: true,
        envMapIntensity: 0.7,
      }),
      pulp: new THREE.MeshStandardMaterial({
        color: 0xb85432,
        roughness: 0.42,
        metalness: 0,
        transparent: true,
        emissive: new THREE.Color(0x521808),
        emissiveIntensity: 0.35,
        envMapIntensity: 0.5,
      }),
      cement: new THREE.MeshStandardMaterial({
        color: 0xc7a878,
        roughness: 0.78,
        metalness: 0,
        transparent: true,
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4,
        envMapIntensity: 0.5,
      }),
      pdl: new THREE.MeshStandardMaterial({
        color: 0x93ab94,
        roughness: 0.7,
        metalness: 0,
        transparent: true,
        opacity: ALPHA_BASE.pdl,
        polygonOffset: true,
        polygonOffsetFactor: -8,
        polygonOffsetUnits: -8,
        envMapIntensity: 0.4,
      }),
    }

    for (const id of LAYERS) {
      const pivot = new THREE.Group()
      this.pivots[id] = pivot
    }

    this.addLights()

    this.observer = new ResizeObserver(() => this.resize())
    this.observer.observe(this.host)
    this.resize()
    this.tick()
  }

  private addLights(): void {
    const key = new THREE.DirectionalLight(0xffe9ca, 2.0)
    key.position.set(320, 380, 480)
    this.scene.add(key)

    const fill = new THREE.DirectionalLight(0xffd9b4, 0.5)
    fill.position.set(-420, 120, 300)
    this.scene.add(fill)

    const rim = new THREE.DirectionalLight(0xffffff, 1.6)
    rim.position.set(-120, -220, -420)
    this.scene.add(rim)

    this.scene.add(new THREE.AmbientLight(0xfff6ec, 0.2))
  }

  async setTooth(fdi: number): Promise<void> {
    if (!this.disposed && this.currentFdi === fdi && this.toothRoot) return

    const token = ++this.loadToken
    this.currentFdi = fdi
    this.onLoading?.(true)

    try {
      const { scene, buckets, box, crownBox } = await loadTooth(fdi)
      if (this.disposed || token !== this.loadToken) {
        disposeObject(scene)
        return
      }

      this.clearTooth()

      const size = box.getSize(new THREE.Vector3())
      const center = box.getCenter(new THREE.Vector3())
      const scale = TOOTH_HEIGHT / Math.max(size.y, 0.001)

      const root = new THREE.Group()
      const crownsDown = crownBox.getCenter(new THREE.Vector3()).y < center.y

      for (const id of LAYERS) {
        const anchor = new THREE.Group()
        for (const object of buckets[id]) {
          if (object instanceof THREE.Mesh) object.material = this.materials[id]
          anchor.attach(object)
        }
        // Normalise inside the anchor; the pivot outside it carries the explode offset.
        anchor.scale.setScalar(scale)
        anchor.position.copy(center).multiplyScalar(-scale)

        // Some arches store the crown pointing down; flip it so it always stands up.
        // The flipper sits outside the anchor so the rotation is about the tooth centre.
        const flipper = new THREE.Group()
        if (crownsDown) flipper.rotation.z = Math.PI
        flipper.add(anchor)
        this.pivots[id].add(flipper)
        root.add(this.pivots[id])
      }

      this.toothRoot = root
      this.scene.add(root)
      this.onLoading?.(false)
    } catch (error) {
      console.error('No se pudo cargar el diente', fdi, error)
      if (token === this.loadToken) this.onLoading?.(false)
    }
  }

  private clearTooth(): void {
    if (!this.toothRoot) return
    this.scene.remove(this.toothRoot)
    disposeObject(this.toothRoot)
    for (const id of LAYERS) {
      this.pivots[id].clear()
      this.pivots[id].position.set(0, 0, 0)
    }
    this.toothRoot = null
  }

  private pauseAutoRotate = (): void => {
    this.controls.autoRotate = false
    if (this.resumeTimer) clearTimeout(this.resumeTimer)
    this.resumeTimer = setTimeout(() => {
      if (!this.disposed) this.controls.autoRotate = true
    }, 5200)
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

    const now = performance.now()
    const dt = Math.min((now - this.lastTime) / 1000, 0.05)
    this.lastTime = now
    const elapsed = (now - this.startedAt) / 1000

    if (this.camT < 1) {
      this.camT = Math.min(1, this.camT + dt / 0.9)
      const e = 1 - Math.pow(1 - this.camT, 3)
      this.camera.position.z = CAMERA_ENTER + (CAMERA_HOME - CAMERA_ENTER) * e
    } else if (this.camAnimating) {
      this.camera.position.z += (this.camGoal - this.camera.position.z) * Math.min(1, dt * 4)
      if (Math.abs(this.camGoal - this.camera.position.z) < 2) {
        this.camera.position.z = this.camGoal
        this.camAnimating = false
      }
    }

    this.explode += (this.targetExplode - this.explode) * Math.min(1, dt * 5)
    const ease = this.explode * this.explode * (3 - 2 * this.explode)

    for (const id of LAYERS) {
      const on = this.visible.includes(id)
      const base = id === 'enamel' ? this.enamelAlpha : ALPHA_BASE[id]
      const target = on ? base + (ALPHA_EXPLODED[id] - base) * ease : 0
      this.alpha[id] += (target - this.alpha[id]) * Math.min(1, dt * 9)

      this.materials[id].opacity = this.alpha[id]
      if (id === 'enamel') this.materials[id].depthWrite = this.alpha[id] > 0.9

      const pivot = this.pivots[id]
      pivot.position.x = OFFSETS[id].x * ease
      pivot.position.z = OFFSETS[id].z * ease
      pivot.visible = this.alpha[id] > 0.01
    }

    if (this.toothRoot) {
      this.toothRoot.position.y = Math.sin(elapsed * 0.7) * 2.2
      this.toothRoot.position.x = 80 * ease
    }

    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }

  setTheme(theme: 'dark' | 'light'): void {
    const dark = theme === 'dark'
    this.renderer.toneMappingExposure = dark ? 0.7 : 1.0
    this.materials.enamel.color.setHex(dark ? 0xefe2ca : 0xfff0da)
    this.materials.dentin.color.setHex(dark ? 0xc0956a : 0xe0b985)
    this.enamelAlpha = dark ? 0.92 : 0.38
    this.materials.pulp.color.setHex(dark ? 0x9e4227 : 0xb85432)
    this.materials.cement.color.setHex(dark ? 0xaa8b62 : 0xc7a878)
    this.materials.pdl.color.setHex(dark ? 0x7a9079 : 0x93ab94)
  }

  setLayer(id: LayerId, visible: boolean): void {
    const index = this.visible.indexOf(id)
    if (visible && index === -1) this.visible.push(id)
    if (!visible && index !== -1) this.visible.splice(index, 1)
  }

  setAllLayers(visibility: LayerVisibility): void {
    for (const id of LAYERS) this.setLayer(id, visibility[id])
  }

  setExploded(exploded: boolean): void {
    this.targetExplode = exploded ? 1 : 0
    this.camGoal = exploded ? CAMERA_EXPLODED : CAMERA_HOME
    this.camAnimating = true
  }

  reset(): void {
    this.camT = 0
    this.camGoal = CAMERA_HOME
    this.camAnimating = false
    this.controls.autoRotate = false
    this.pauseAutoRotate()
  }

  dispose(): void {
    this.disposed = true
    cancelAnimationFrame(this.frame)
    if (this.resumeTimer) clearTimeout(this.resumeTimer)
    this.observer.disconnect()
    this.controls.removeEventListener('start', this.pauseAutoRotate)
    this.controls.dispose()
    this.clearTooth()
    for (const id of LAYERS) this.materials[id].dispose()
    this.renderer.dispose()
  }
}
