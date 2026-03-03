import React, {
  useMemo,
  useRef,
  useState,
  useLayoutEffect,
  useEffect,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { Network, ZoomIn, Info, RotateCcw, FileText, ArrowRight, Search, X } from "lucide-react";
import { GraphNode, GraphEdge } from "@/types";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useStore } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import Link from "next/link";

// Augment JSX namespace
declare global {
  namespace JSX {
    interface IntrinsicElements {
      lineSegments: any;
      bufferGeometry: any;
      lineBasicMaterial: any;
      instancedMesh: any;
      sphereGeometry: any;
      instancedBufferAttribute: any;
      meshStandardMaterial: any;
      meshPhysicalMaterial: any;
      ambientLight: any;
      pointLight: any;
      color: any;
      group: any;
      mesh: any;
      ringGeometry: any;
      fog: any;
    }
  }
}

// Configuration - Vibrant Palette
const NODE_COLORS = {
  person: "#3b82f6", // Blue
  org: "#d946ef", // Fuchsia
  location: "#22c55e", // Green
  concept: "#f97316", // Orange
};

const SPHERE_RADIUS = 35;
const NODE_SIZE = 0.9; // Moderately sized nodes
const HOVER_SIZE = 1.3; // Hover ring
const SELECTED_SIZE = 1.8; // Selection ring

// -- Algorithm: Fibonacci Sphere Distribution --
function getSphericalCoordinates(nodes: GraphNode[]) {
  const positions: THREE.Vector3[] = [];

  if (nodes.length === 0) return positions;
  if (nodes.length === 1) {
    positions.push(new THREE.Vector3(0, 0, 0));
    return positions;
  }

  const phi = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  nodes.forEach((node, i) => {
    const y = 1 - (i / (nodes.length - 1)) * 2; // y goes from 1 to -1
    const radiusAtY = Math.sqrt(1 - y * y); // Radius at y
    const theta = phi * i; // Golden angle increment

    const x = Math.cos(theta) * radiusAtY;
    const z = Math.sin(theta) * radiusAtY;

    positions.push(
      new THREE.Vector3(
        x * SPHERE_RADIUS,
        y * SPHERE_RADIUS,
        z * SPHERE_RADIUS,
      ),
    );
  });

  return positions;
}

// -- Component: Theme Effect --
const ThemeEffect = ({ theme }: { theme: "light" | "dark" }) => {
  const { scene } = useThree();

  useEffect(() => {
    const bgColor = new THREE.Color(theme === "dark" ? "#020617" : "#f8fafc");
    const fogColor = new THREE.Color(theme === "dark" ? "#020617" : "#f8fafc");

    scene.background = bgColor;
    scene.fog = new THREE.Fog(fogColor, 60, 180);
  }, [theme, scene]);

  return null;
};

// -- Component: Rotating Group --
const RotatingGroup = ({
  children,
  autoRotate = true,
}: {
  children: React.ReactNode;
  autoRotate?: boolean;
}) => {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current && autoRotate) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  return <group ref={groupRef}>{children}</group>;
};

// -- Component: Edges --
const Edges = ({
  nodes,
  edges,
  positions,
  opacity,
  theme,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  positions: THREE.Vector3[];
  opacity: number;
  theme: "light" | "dark";
}) => {
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  useLayoutEffect(() => {
    if (!geometryRef.current) return;
    const nodeIndexMap = new Map(nodes.map((n, i) => [n.id, i]));
    const vertices: number[] = [];

    edges.forEach((edge) => {
      const fromIndex = nodeIndexMap.get(edge.from);
      const toIndex = nodeIndexMap.get(edge.to);
      if (fromIndex !== undefined && toIndex !== undefined) {
        const p1 = positions[fromIndex];
        const p2 = positions[toIndex];
        if (p1.distanceTo(p2) < SPHERE_RADIUS * 1.5) {
          vertices.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
        }
      }
    });

    const buffer = new Float32Array(vertices);
    geometryRef.current.setAttribute(
      "position",
      new THREE.BufferAttribute(buffer, 3),
    );
    geometryRef.current.attributes.position.needsUpdate = true;
  }, [nodes, edges, positions]);

  const edgeColor = theme === "dark" ? "#475569" : "#cbd5e1";
  const edgeOpacity = theme === "dark" ? opacity * 0.2 : opacity * 0.4;

  return (
    <lineSegments>
      <bufferGeometry ref={geometryRef} />
      <lineBasicMaterial
        color={edgeColor}
        transparent
        opacity={edgeOpacity}
        blending={THREE.NormalBlending}
        depthWrite={false}
        linewidth={1}
      />
    </lineSegments>
  );
};

// -- Component: Glowing Particles along Edges --
const EdgeParticles = ({
  nodes,
  edges,
  positions,
  theme,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
  positions: THREE.Vector3[];
  theme: "light" | "dark";
}) => {
  const PARTICLE_COUNT = 80;
  const particlesRef = useRef<THREE.Points>(null);
  const particleData = useRef<
    Array<{ fromIdx: number; toIdx: number; progress: number; speed: number }>
  >([]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const posArray = new Float32Array(PARTICLE_COUNT * 3);
    const colorArray = new Float32Array(PARTICLE_COUNT * 3);
    geo.setAttribute("position", new THREE.BufferAttribute(posArray, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));
    return geo;
  }, []);

  // Initialize particle data
  useEffect(() => {
    if (positions.length === 0 || edges.length === 0) return;
    const nodeIndexMap = new Map(nodes.map((n, i) => [n.id, i]));

    // Build valid edge pairs
    const validEdgePairs: Array<{ fromIdx: number; toIdx: number }> = [];
    edges.forEach((edge) => {
      const fromIdx = nodeIndexMap.get(edge.from);
      const toIdx = nodeIndexMap.get(edge.to);
      if (fromIdx !== undefined && toIdx !== undefined) {
        const p1 = positions[fromIdx];
        const p2 = positions[toIdx];
        if (p1.distanceTo(p2) < SPHERE_RADIUS * 1.5) {
          validEdgePairs.push({ fromIdx, toIdx });
        }
      }
    });

    if (validEdgePairs.length === 0) return;

    particleData.current = Array.from({ length: PARTICLE_COUNT }, () => {
      const edgePair =
        validEdgePairs[Math.floor(Math.random() * validEdgePairs.length)];
      return {
        ...edgePair,
        progress: Math.random(),
        speed: 0.1 + Math.random() * 0.25,
      };
    });
  }, [nodes, edges, positions]);

  useFrame((_, delta) => {
    if (
      !particlesRef.current ||
      positions.length === 0 ||
      particleData.current.length === 0
    )
      return;

    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = geometry.attributes.color as THREE.BufferAttribute;

    particleData.current.forEach((particle, i) => {
      particle.progress += delta * particle.speed;
      if (particle.progress > 1) {
        particle.progress -= 1;
        // Optionally switch to a new random edge
        if (Math.random() > 0.5 && edges.length > 1) {
          const nodeIndexMap = new Map(nodes.map((n, idx) => [n.id, idx]));
          const validEdges = edges.filter((e) => {
            const fi = nodeIndexMap.get(e.from);
            const ti = nodeIndexMap.get(e.to);
            return fi !== undefined && ti !== undefined;
          });
          if (validEdges.length > 0) {
            const edge =
              validEdges[Math.floor(Math.random() * validEdges.length)];
            particle.fromIdx = nodeIndexMap.get(edge.from)!;
            particle.toIdx = nodeIndexMap.get(edge.to)!;
          }
        }
      }

      const p1 = positions[particle.fromIdx];
      const p2 = positions[particle.toIdx];
      if (!p1 || !p2) return;

      const x = p1.x + (p2.x - p1.x) * particle.progress;
      const y = p1.y + (p2.y - p1.y) * particle.progress;
      const z = p1.z + (p2.z - p1.z) * particle.progress;

      posAttr.setXYZ(i, x, y, z);

      // Glow intensity based on progress (brightest at center of edge)
      const glow = Math.sin(particle.progress * Math.PI);
      const baseColor =
        theme === "dark"
          ? new THREE.Color("#38bdf8") // sky-400
          : new THREE.Color("#2563eb"); // blue-600
      baseColor.multiplyScalar(0.5 + glow * 0.8);
      colorAttr.setXYZ(i, baseColor.r, baseColor.g, baseColor.b);
    });

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  });

  if (positions.length === 0 || edges.length === 0) return null;

  return (
    <points ref={particlesRef} geometry={geometry}>
      <pointsMaterial
        size={theme === "dark" ? 2.5 : 1.8}
        vertexColors
        transparent
        opacity={0.9}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        sizeAttenuation
      />
    </points>
  );
};

// -- Component: Nodes --
const Nodes = ({
  nodes,
  positions,
  onNodeClick,
  opacity,
  theme,
}: {
  nodes: GraphNode[];
  positions: THREE.Vector3[];
  onNodeClick: (node: GraphNode, pos: THREE.Vector3) => void;
  opacity: number;
  theme: "light" | "dark";
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  const colorArray = useMemo(() => new Float32Array(nodes.length * 3), [nodes]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    nodes.forEach((node, i) => {
      tempObject.position.copy(positions[i]);
      tempObject.lookAt(0, 0, 0);
      tempObject.scale.setScalar(1);
      tempObject.updateMatrix();
      meshRef.current!.setMatrixAt(i, tempObject.matrix);

      const colorHex =
        NODE_COLORS[node.entityType as keyof typeof NODE_COLORS] ||
        NODE_COLORS.concept;
      const c = new THREE.Color(colorHex);
      if (theme === "dark") c.offsetHSL(0, 0, 0.1);
      c.toArray(colorArray, i * 3);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.geometry.attributes.color) {
      meshRef.current.geometry.attributes.color.needsUpdate = true;
    }
  }, [nodes, positions, theme, colorArray, tempObject]);

  return (
    <group>
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, nodes.length]}
        onPointerOver={(e: any) => {
          e.stopPropagation();
          setHovered(e.instanceId!);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(null);
          document.body.style.cursor = "auto";
        }}
        onClick={(e: any) => {
          e.stopPropagation();
          if (e.instanceId !== undefined)
            onNodeClick(nodes[e.instanceId], positions[e.instanceId]);
        }}
      >
        <sphereGeometry args={[NODE_SIZE, 16, 16]}>
          <instancedBufferAttribute
            attach="attributes-color"
            args={[colorArray, 3]}
          />
        </sphereGeometry>
        <meshPhysicalMaterial
          vertexColors
          toneMapped={false}
          transparent
          opacity={opacity}
          roughness={0.4}
          metalness={0.2}
          clearcoat={1}
        />
      </instancedMesh>

      {/* Hover Effects */}
      {hovered !== null && positions[hovered] && (
        <>
          <mesh position={positions[hovered]}>
            <sphereGeometry args={[HOVER_SIZE, 16, 16]} />
            <meshBasicMaterial
              color={theme === "dark" ? "#ffffff" : "#000000"}
              wireframe
              transparent
              opacity={0.3}
            />
          </mesh>
          <Html position={positions[hovered]} style={{ pointerEvents: "none" }}>
            <div
              className={`px-4 py-2 rounded-lg shadow-xl border whitespace-nowrap transform -translate-y-12 backdrop-blur-md flex flex-col items-center z-50 transition-colors duration-300
                    ${theme === "dark"
                  ? "bg-slate-900/90 text-slate-50 border-slate-700"
                  : "bg-white/95 text-slate-900 border-slate-200"
                }`}
            >
              <span className="text-sm font-bold">{nodes[hovered].label}</span>
              <span
                className="text-[10px] uppercase font-bold tracking-widest opacity-70 mt-0.5"
                style={{
                  color:
                    NODE_COLORS[
                    nodes[hovered].entityType as keyof typeof NODE_COLORS
                    ],
                }}
              >
                {nodes[hovered].entityType}
              </span>
            </div>
          </Html>
        </>
      )}
    </group>
  );
};

// -- Main Export --
export const Graph3D = ({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { theme } = useStore();

  const { data: searchData, isLoading: isSearching } = useQuery({
    queryKey: ["graph-search", searchQuery],
    queryFn: () => api.search(searchQuery),
    enabled: !!searchQuery && searchQuery.length > 2,
  });

  const positions = useMemo(() => getSphericalCoordinates(nodes), [nodes]);

  const handleNodeClick = (node: GraphNode, pos: THREE.Vector3) => {
    setSelectedNode(node);
    setAutoRotate(false);
  };

  if (nodes.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
        No nodes to display.
      </div>
    );
  }

  return (
    <div className="w-full h-full relative transition-colors duration-500">
      <Canvas
        camera={{ position: [0, 0, 90], fov: 45 }}
        shadows={false}
        dpr={[1, 2]}
      >
        <ThemeEffect theme={theme} />

        {/* Lighting */}
        <ambientLight intensity={theme === "dark" ? 1.5 : 2.0} />
        <pointLight
          position={[50, 50, 50]}
          intensity={1}
          color={theme === "dark" ? "#38bdf8" : "#fff"}
        />
        <pointLight
          position={[-50, -50, -50]}
          intensity={0.5}
          color="#f472b6"
        />

        <OrbitControls
          enablePan={false}
          minDistance={40}
          maxDistance={120}
          autoRotate={false}
          onStart={() => setAutoRotate(false)}
        />

        <RotatingGroup autoRotate={autoRotate}>
          {/* Inner Wireframe Sphere */}
          <mesh>
            <sphereGeometry args={[SPHERE_RADIUS - 0.5, 24, 24]} />
            <meshBasicMaterial
              color={theme === "dark" ? "#1e293b" : "#e2e8f0"}
              wireframe
              transparent
              opacity={theme === "dark" ? 0.15 : 0.4}
            />
          </mesh>

          <Edges
            nodes={nodes}
            edges={edges}
            positions={positions}
            opacity={1}
            theme={theme}
          />
          <EdgeParticles
            nodes={nodes}
            edges={edges}
            positions={positions}
            theme={theme}
          />
          <Nodes
            nodes={nodes}
            positions={positions}
            onNodeClick={handleNodeClick}
            opacity={1}
            theme={theme}
          />

          {selectedNode &&
            (() => {
              const idx = nodes.findIndex((n) => n.id === selectedNode.id);
              if (idx >= 0) {
                return (
                  <mesh position={positions[idx]}>
                    <sphereGeometry args={[SELECTED_SIZE, 16, 16]} />
                    <meshBasicMaterial
                      color="#fbbf24"
                      wireframe
                      transparent
                      opacity={0.8}
                    />
                  </mesh>
                );
              }
              return null;
            })()}
        </RotatingGroup>
      </Canvas>

      {/* Helper UI Overlay */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-2 pointer-events-none">
        <div
          className={`p-4 rounded-xl border shadow-lg backdrop-blur-md transition-colors duration-300
              ${theme === "dark" ? "bg-slate-900/80 border-slate-700 text-slate-200" : "bg-white/90 border-slate-200 text-slate-700"}
          `}
        >
          <div className="flex gap-4 text-xs font-semibold">
            {Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shadow-sm"
                  style={{ backgroundColor: color }}
                ></span>
                <span className="uppercase">{type}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {selectedNode && (
        <div
          className={`absolute top-4 right-4 w-80 backdrop-blur-xl border p-6 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-right-8 z-10 transition-colors duration-300
            ${theme === "dark" ? "bg-slate-900/95 border-slate-700 text-slate-50" : "bg-white/95 border-slate-200 text-slate-900"}
        `}
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-xl leading-tight">
              {selectedNode.label}
            </h3>
            <button
              onClick={() => {
                setSelectedNode(null);
                setAutoRotate(true);
              }}
              className={`transition-colors rounded-full p-1 
                ${theme === "dark" ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}
             `}
            >
              ✕
            </button>
          </div>

          <div className="flex gap-2 mb-5">
            <span
              className="text-[10px] uppercase font-bold tracking-widest text-white px-3 py-1 rounded-full shadow-sm"
              style={{
                backgroundColor:
                  NODE_COLORS[
                  selectedNode.entityType as keyof typeof NODE_COLORS
                  ],
              }}
            >
              {selectedNode.entityType}
            </span>
          </div>

          <div
            className={`rounded-lg p-3 border mb-4 
              ${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-50 border-slate-100"}
           `}
          >
            <div className="flex items-center gap-2 mb-2 text-muted-foreground text-xs font-semibold uppercase">
              <Info size={12} /> Connected to
            </div>
            <div
              className={`text-sm ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}
            >
              {
                edges.filter(
                  (e) => e.from === selectedNode.id || e.to === selectedNode.id,
                ).length
              }{" "}
              other entities
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setAutoRotate(!autoRotate);
              }}
              className={`flex-1 text-xs font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2
                    ${theme === "dark" ? "bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200" : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-700"}
                `}
            >
              <RotateCcw size={14} />{" "}
              {autoRotate ? "Pause" : "Resume"}
            </button>
            <button
              onClick={() => {
                if (selectedNode.id.startsWith('doc_')) {
                  const realId = selectedNode.id.replace('doc_', '');
                  window.location.href = `/doc/${encodeURIComponent(realId)}/view`;
                } else {
                  setSearchQuery(selectedNode.label);
                }
              }}
              className={`flex-1 text-xs font-bold py-3 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2
                    ${theme === "dark" ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"}
                `}
            >
              {selectedNode.id.startsWith("doc_") ? <ZoomIn size={14} /> : <Search size={14} />}
              {selectedNode.id.startsWith("doc_") ? "Open Doc" : "View Documents"}
            </button>
          </div>
        </div>
      )}

      {/* Embedded Search Side Panel */}
      {searchQuery && (
        <div
          className={`absolute top-4 left-4 w-96 max-h-[90vh] overflow-y-auto backdrop-blur-xl border p-6 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-left-8 z-20 layout-scroller transition-colors duration-300
            ${theme === "dark" ? "bg-slate-900/95 border-slate-700 text-slate-50" : "bg-white/95 border-slate-200 text-slate-900"}
          `}
        >
          <div className="flex justify-between items-center mb-6 sticky top-0 backdrop-blur-md pb-2 z-10 border-b border-border/50">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <Search className="text-primary" size={18} /> "{searchQuery}"
            </h2>
            <button
              onClick={() => setSearchQuery("")}
              className={`transition-colors rounded-full p-1.5 
                ${theme === "dark" ? "hover:bg-slate-800 text-slate-400" : "hover:bg-slate-100 text-slate-500"}
              `}
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4">
            {isSearching && (
              <div className="text-sm text-center text-muted-foreground py-8">
                Searching Knowledge Base...
              </div>
            )}

            {!isSearching && searchData?.results.length === 0 && (
              <div className="text-sm text-center text-muted-foreground py-8 bg-muted/20 rounded-lg">
                No related documents found.
              </div>
            )}

            {!isSearching && searchData && searchData.results.map((result: any, idx: number) => (
              <div
                key={idx}
                className={`border rounded-lg p-4 hover:border-primary/50 transition-all group
                  ${theme === "dark" ? "bg-slate-800/50 border-slate-700" : "bg-slate-50 border-slate-200"}
                `}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2 text-primary text-xs font-bold leading-tight line-clamp-2">
                    <FileText size={12} className="shrink-0" />
                    {result.docTitle}
                  </div>
                  <Link
                    href={`/doc/${result.docId}/view`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                  >
                    <ArrowRight size={14} />
                  </Link>
                </div>

                <div
                  className="text-xs opacity-80 leading-relaxed font-serif line-clamp-4"
                  dangerouslySetInnerHTML={{ __html: result.snippet }}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
