import React from "react";
import CytoscapeComponent from "react-cytoscapejs";
import cytoscape from "cytoscape";
import { GraphNode, GraphEdge } from "@/types";
import { useStore } from "@/lib/store";

export const Graph2D = ({
  nodes,
  edges,
}: {
  nodes: GraphNode[];
  edges: GraphEdge[];
}) => {
  const { theme } = useStore();

  const elements = React.useMemo(() => {
    const nodeElements = nodes.map((n) => ({
      data: {
        id: n.id,
        label: n.label,
        type: n.entityType,
        weight: n.weight || 1,
      },
    }));

    const edgeElements = edges.map((e) => ({
      data: {
        id: e.id,
        source: e.from,
        target: e.to,
        label: e.relation,
      },
    }));

    return [...nodeElements, ...edgeElements];
  }, [nodes, edges]);

  // Styling based on entity type - Adaptive to Theme
  const stylesheet: any[] = React.useMemo(
    () => [
      {
        selector: "node",
        style: {
          label: "data(label)",
          "text-valign": "bottom",
          "text-halign": "center",
          // Dark Mode: Text light slate | Light Mode: Text dark slate
          color: theme === "dark" ? "#cbd5e1" : "#334155",
          "font-size": "10px",
          "font-weight": "bold",
          width: 24,
          height: 24,
          "border-width": 2,
          "border-color": theme === "dark" ? "#1e293b" : "#ffffff",
          "background-color": "#94a3b8",
        },
      },
      {
        selector: 'node[type="person"]',
        style: { "background-color": "#2563eb" }, // blue-600
      },
      {
        selector: 'node[type="location"]',
        style: { "background-color": "#10b981" }, // emerald-500
      },
      {
        selector: 'node[type="org"]',
        style: { "background-color": "#6366f1" }, // indigo-500
      },
      {
        selector: 'node[type="concept"]',
        style: { "background-color": "#f59e0b" }, // amber-500
      },
      {
        selector: "edge",
        style: {
          width: 1.5,
          // Dark Mode: Light Edge (Contrast with dark bg)
          // Light Mode: Dark Edge (Contrast with white bg)
          "line-color": theme === "dark" ? "#cbd5e1" : "#475569",
          "curve-style": "bezier",
          "target-arrow-shape": "none",
        },
      },
    ],
    [theme],
  );

  return (
    <div className="w-full h-full bg-background transition-colors duration-300">
      <CytoscapeComponent
        elements={elements}
        style={{ width: "100%", height: "100%" }}
        stylesheet={stylesheet}
        layout={{
          name: "cose",
          animate: false,
          nodeRepulsion: 4500,
          idealEdgeLength: 50,
        }}
        cy={(cy) => {
          cy.on("tap", "node", (evt: any) => {
            const node = evt.target;
            const nodeId = node.id();
            const label = node.data().label;

            if (nodeId.startsWith('doc_')) {
              const realId = nodeId.replace('doc_', '');
              window.location.href = `/doc/${encodeURIComponent(realId)}/view`;
            } else if (nodeId.startsWith('kw_')) {
              window.location.href = `/search?q=${encodeURIComponent(label)}`;
            }
          });
        }}
      />
    </div>
  );
};
