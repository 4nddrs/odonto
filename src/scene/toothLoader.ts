import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js'

export type LayerId = 'enamel' | 'dentin' | 'pulp' | 'cement' | 'pdl'
export type LayerVisibility = Record<LayerId, boolean>

export const LAYERS: LayerId[] = ['enamel', 'dentin', 'pulp', 'cement', 'pdl']

const loader = new GLTFLoader()
loader.setMeshoptDecoder(MeshoptDecoder)

function classify(name: string): LayerId | null {
  const key = name.toLowerCase()
  if (key.startsWith('enamel')) return 'enamel'
  if (key.startsWith('dentin')) return 'dentin'
  if (key.startsWith('pulp') || key.startsWith('canal')) return 'pulp'
  if (key.startsWith('cement')) return 'cement'
  if (key.startsWith('pdl')) return 'pdl'
  return null
}

export interface LoadedTooth {
  scene: THREE.Group
  buckets: Record<LayerId, THREE.Object3D[]>
  box: THREE.Box3
  crownBox: THREE.Box3
}

export function emptyBuckets(): Record<LayerId, THREE.Object3D[]> {
  return { enamel: [], dentin: [], pulp: [], cement: [], pdl: [] }
}

export function loadGLTF(url: string) {
  return loader.loadAsync(url)
}

export async function loadTooth(fdi: number): Promise<LoadedTooth> {
  const url = `${import.meta.env.BASE_URL}models/teeth/tooth-${fdi}.glb`
  const gltf = await loader.loadAsync(url)
  const scene = gltf.scene
  scene.updateMatrixWorld(true)

  const buckets = emptyBuckets()
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const layer = classify(object.name)
    if (!layer) return
    // The source ships quantised normals; recompute them for smooth shading.
    object.geometry.computeVertexNormals()
    buckets[layer].push(object)
  })

  const box = new THREE.Box3().setFromObject(scene)

  // The enamel only exists on the crown, so it tells us which end is up.
  const crownBox = new THREE.Box3()
  for (const mesh of buckets.enamel) crownBox.expandByObject(mesh)

  return { scene, buckets, box, crownBox }
}

export function disposeObject(root: THREE.Object3D): void {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) object.geometry.dispose()
  })
}
