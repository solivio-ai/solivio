"use client";

import type { Connection, Edge, Node } from "@xyflow/react";
import {
  Background,
  BackgroundVariant,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import { LayoutDashboard, Plus, Unlink } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@solivio/ui/components/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@solivio/ui/components/dropdown-menu.tsx";

import type { MapArticle, MapConnection } from "../lib/mapTypes.ts";
import { AddNodeDialog } from "./AddNodeDialog.tsx";
import type { ArticleNodeData } from "./ArticleNode.tsx";
import { ArticleNode } from "./ArticleNode.tsx";

const NODE_WIDTH = 220;
const NODE_HEIGHT = 110;

const nodeTypes = { article: ArticleNode };

const CONN_EDGE_STYLE: Record<string, string> = {
  related: "#0d9488",
  prerequisite: "#f59e0b",
  contradicts: "#dc2626",
  supersedes: "#7c3aed",
};

const HOVER_STROKE = "#F6C215";

function buildNodes(
  articles: MapArticle[],
  onNodeClick: (id: string) => void,
  onAddChild: (id: string) => void,
  onDelete: (id: string) => void,
): Node<ArticleNodeData>[] {
  const childIds = new Set(articles.filter((a) => a.parentId).map((a) => a.parentId!));
  return articles.map((a) => ({
    id: a.id,
    type: "article" as const,
    position: { x: a.positionX ?? 0, y: a.positionY ?? 0 },
    data: {
      title: a.title,
      body: a.body,
      type: a.type,
      updatedAt: a.updatedAt,
      hasChildren: childIds.has(a.id),
      onClick: () => onNodeClick(a.id),
      onAddChild: () => onAddChild(a.id),
      onDelete: () => onDelete(a.id),
    },
  }));
}

function buildEdges(articles: MapArticle[], connections: MapConnection[]): Edge[] {
  const parentEdges: Edge[] = articles
    .filter((a) => a.parentId)
    .map((a) => ({
      id: `p-${a.parentId}-${a.id}`,
      source: a.parentId!,
      target: a.id,
      type: "smoothstep",
      style: { stroke: "hsl(var(--border))", strokeWidth: 1.5 },
    }));

  const connEdges: Edge[] = connections.map((c) => ({
    id: `c-${c.id}`,
    source: c.fromId,
    target: c.toId,
    type: "default",
    label: c.type,
    labelStyle: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
    labelBgStyle: { fill: "hsl(var(--background))" },
    style: { stroke: CONN_EDGE_STYLE[c.type] ?? CONN_EDGE_STYLE.related, strokeWidth: 1.5 },
  }));

  return [...parentEdges, ...connEdges];
}

async function runElkLayout<T extends Record<string, unknown>>(
  nodes: Node<T>[],
  edges: Edge[],
): Promise<Node<T>[]> {
  const ELK = (await import("elkjs/lib/elk.bundled.js")).default;
  const elk = new ELK();

  const graph = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "60",
      "elk.layered.spacing.nodeNodeBetweenLayers": "100",
      "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
    },
    children: nodes.map((n) => ({ id: n.id, width: NODE_WIDTH, height: NODE_HEIGHT })),
    edges: edges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  const layout = await elk.layout(graph);
  return nodes.map((node) => {
    const lNode = layout.children?.find((c) => c.id === node.id);
    return lNode ? { ...node, position: { x: lNode.x ?? 0, y: lNode.y ?? 0 } } : node;
  });
}

async function persistPositions(spaceId: string, nodes: Node[]) {
  await fetch(`/api/knowledge-base/spaces/${spaceId}/positions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      positions: nodes.map((n) => ({ id: n.id, x: n.position.x, y: n.position.y })),
    }),
  });
}

async function setArticleParent(articleId: string, parentId: string | null) {
  await fetch(`/api/knowledge-base/articles/${articleId}/parent`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ parentId }),
  });
}

type EdgeMenu = { edge: Edge; x: number; y: number };

type Props = {
  articles: MapArticle[];
  connections: MapConnection[];
  spaceId: string;
  onArticleClick: (id: string) => void;
};

type AddNodeState = { parentId: string | null; position: { x: number; y: number } | null };

function SpaceMapInner({ articles, connections, spaceId, onArticleClick }: Props) {
  const t = useTranslations("knowledge-base.map");

  // Stable refs keep state setters and current nodes accessible in callbacks
  // declared before useNodesState/useEdgesState.
  const nodesRef = useRef<Node<ArticleNodeData>[]>([]);
  const edgesRef = useRef<Edge[]>([]);
  const setNodesRef = useRef<((fn: (nds: Node<ArticleNodeData>[]) => Node<ArticleNodeData>[]) => void) | null>(null);
  const setEdgesRef = useRef<((fn: (eds: Edge[]) => Edge[]) => void) | null>(null);
  const [addNodeState, setAddNodeState] = useState<AddNodeState | null>(null);

  const handleAddChild = useCallback((parentId: string) => {
    const parentNode = nodesRef.current.find((n) => n.id === parentId);
    setAddNodeState({ parentId, position: parentNode?.position ?? { x: 0, y: 0 } });
  }, []);

  const handleDelete = useCallback((id: string) => {
    // BFS over parent edges to collect the full subtree, mirroring DB cascade.
    const toDelete = new Set<string>([id]);
    const queue = [id];
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const e of edgesRef.current) {
        if (e.id.startsWith("p-") && e.source === current && !toDelete.has(e.target)) {
          toDelete.add(e.target);
          queue.push(e.target);
        }
      }
    }
    setNodesRef.current?.((nds) => nds.filter((n) => !toDelete.has(n.id)));
    setEdgesRef.current?.((eds) => eds.filter((e) => !toDelete.has(e.source) && !toDelete.has(e.target)));
    fetch(`/api/knowledge-base/articles/${id}`, { method: "DELETE" });
  }, []);

  const initNodes = buildNodes(articles, onArticleClick, handleAddChild, handleDelete);
  const initEdges = buildEdges(articles, connections);

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);
  nodesRef.current = nodes;
  edgesRef.current = edges;
  setNodesRef.current = setNodes;
  setEdgesRef.current = setEdges;

  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [edgeMenu, setEdgeMenu] = useState<EdgeMenu | null>(null);
  const autoLayoutRan = useRef(false);

  useEffect(() => {
    if (autoLayoutRan.current) return;
    const needsLayout = articles.some((a) => a.positionX === null);
    if (!needsLayout) return;
    autoLayoutRan.current = true;
    runElkLayout(initNodes, initEdges).then((laidOut) => {
      setNodes(laidOut);
      persistPositions(spaceId, laidOut);
    });
  }, []); // intentionally empty — runs once on mount only

  const handleAutoLayout = useCallback(() => {
    runElkLayout(nodes, edges).then((laidOut) => {
      setNodes(laidOut);
      persistPositions(spaceId, laidOut);
    });
  }, [nodes, edges, spaceId, setNodes]);

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      persistPositions(spaceId, [node]);
    },
    [spaceId],
  );

  const isValidConnection = useCallback(
    (connection: Edge | Connection) => {
      // Only one parent per node.
      if (edges.some((e) => e.target === connection.target && e.id.startsWith("p-"))) {
        return false;
      }
      // Prevent cycles: source will become parent of target, so ensure source
      // is not already a descendant of target.
      const parentOf: Record<string, string> = {};
      for (const e of edges) {
        if (e.id.startsWith("p-")) parentOf[e.target] = e.source;
      }
      let cursor: string | undefined = connection.source ?? undefined;
      while (cursor) {
        if (cursor === connection.target) return false;
        cursor = parentOf[cursor];
      }
      return true;
    },
    [edges],
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      const newEdge: Edge = {
        id: `p-${params.source}-${params.target}`,
        source: params.source,
        target: params.target,
        type: "smoothstep",
        style: { stroke: "hsl(var(--border))", strokeWidth: 1.5 },
      };
      setEdges((eds) => [...eds, newEdge]);
      setArticleParent(params.target, params.source);
    },
    [setEdges],
  );

  const onEdgesDelete = useCallback((deleted: Edge[]) => {
    for (const edge of deleted) {
      if (edge.id.startsWith("p-")) {
        setArticleParent(edge.target, null);
      }
    }
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setEdgeMenu({ edge, x: event.clientX, y: event.clientY });
  }, []);

  const onEdgeMouseEnter = useCallback((_: React.MouseEvent, edge: Edge) => {
    setHoveredEdgeId(edge.id);
  }, []);

  const onEdgeMouseLeave = useCallback(() => {
    setHoveredEdgeId(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setEdgeMenu(null);
  }, []);

  const handleRemoveEdge = useCallback(() => {
    if (!edgeMenu) return;
    setEdges((eds) => eds.filter((e) => e.id !== edgeMenu.edge.id));
    if (edgeMenu.edge.id.startsWith("p-")) {
      setArticleParent(edgeMenu.edge.target, null);
    }
    setEdgeMenu(null);
  }, [edgeMenu, setEdges]);

  const handleNodeCreated = useCallback(
    (article: MapArticle) => {
      const rootOffset =
        addNodeState?.parentId == null ? nodesRef.current.length * (NODE_WIDTH + 24) : 0;
      const newNode: Node<ArticleNodeData> = {
        id: article.id,
        type: "article" as const,
        position: {
          x: article.positionX ?? rootOffset,
          y: article.positionY ?? 0,
        },
        data: {
          title: article.title,
          body: article.body,
          type: article.type,
          updatedAt: article.updatedAt,
          hasChildren: false,
          onClick: () => onArticleClick(article.id),
          onAddChild: () => handleAddChild(article.id),
          onDelete: () => handleDelete(article.id),
        },
      };

      setNodes((nds) => {
        const withNew = [...nds, newNode];
        // Mark the parent as having children.
        if (!addNodeState?.parentId) return withNew;
        return withNew.map((n) =>
          n.id === addNodeState.parentId ? { ...n, data: { ...n.data, hasChildren: true } } : n,
        );
      });

      if (addNodeState?.parentId) {
        const newEdge: Edge = {
          id: `p-${addNodeState.parentId}-${article.id}`,
          source: addNodeState.parentId,
          target: article.id,
          type: "smoothstep",
          style: { stroke: "hsl(var(--border))", strokeWidth: 1.5 },
        };
        setEdges((eds) => [...eds, newEdge]);
      }

      persistPositions(spaceId, [newNode]);
      setAddNodeState(null);
    },
    [addNodeState, onArticleClick, handleAddChild, setNodes, setEdges, spaceId],
  );

  // Apply brand yellow on hover.
  const displayEdges = edges.map((e) =>
    e.id === hoveredEdgeId
      ? { ...e, style: { ...e.style, stroke: HOVER_STROKE, strokeWidth: 2.5 } }
      : e,
  );

  return (
    <>
      <div className="h-full w-full">
        <ReactFlow
          nodes={nodes}
          edges={displayEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onEdgeClick={onEdgeClick}
          onEdgeMouseEnter={onEdgeMouseEnter}
          onEdgeMouseLeave={onEdgeMouseLeave}
          onPaneClick={onPaneClick}
          onNodeDragStop={onNodeDragStop}
          isValidConnection={isValidConnection}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="hsl(var(--border))"
          />
          <Controls
            showInteractive={false}
            className="!rounded-md !border !border-border !bg-card !shadow-sm"
          />
          <Panel position="top-right">
            <Button
              variant="outline"
              size="sm"
              onClick={handleAutoLayout}
              className="gap-1.5 shadow-sm"
            >
              <LayoutDashboard size={14} />
              {t("autoLayout")}
            </Button>
          </Panel>
          <Panel position="bottom-right">
            <Button
              size="icon-lg"
              className="size-14 rounded-full shadow-md"
              onClick={() => setAddNodeState({ parentId: null, position: null })}
            >
              <Plus size={30} />
            </Button>
          </Panel>
        </ReactFlow>
      </div>

      <AddNodeDialog
        open={!!addNodeState}
        spaceId={spaceId}
        parentId={addNodeState?.parentId ?? null}
        parentPosition={addNodeState?.position ?? null}
        onClose={() => setAddNodeState(null)}
        onCreated={handleNodeCreated}
      />

      {/* Virtual-anchor dropdown: zero-size fixed trigger at click coordinates */}
      {edgeMenu && (
        <DropdownMenu open onOpenChange={(open) => !open && setEdgeMenu(null)}>
          <DropdownMenuTrigger
            style={{ position: "fixed", left: edgeMenu.x, top: edgeMenu.y, width: 0, height: 0 }}
          />
          <DropdownMenuContent side="right" align="start" className="w-auto overflow-x-visible">
            {edgeMenu.edge.id.startsWith("p-") && (
              <DropdownMenuItem
                className="gap-2 whitespace-nowrap w-fit text-destructive focus:text-destructive"
                onClick={handleRemoveEdge}
              >
                <Unlink size={14} />
                {t("removeConnection")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}

export function SpaceMap(props: Props) {
  return (
    <ReactFlowProvider>
      <SpaceMapInner {...props} />
    </ReactFlowProvider>
  );
}
