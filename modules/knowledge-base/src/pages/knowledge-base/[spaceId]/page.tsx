import { notFound } from "next/navigation";

import { AppPage } from "@solivio/ui/components/app-page.tsx";

import { KnowledgeBaseShell } from "../../../components/KnowledgeBaseShell.tsx";
import type { MapArticle, MapConnection, MapSpace } from "../../../lib/mapTypes.ts";
import {
  findAllSpaces,
  findArticlesBySpace,
  findConnectionsBySpace,
  findSpaceById,
} from "../../../server/knowledgeBaseRepository.ts";

type Props = { params: Promise<{ spaceId: string }> };

export async function generateMetadata({ params }: Props) {
  const { spaceId } = await params;
  const space = await findSpaceById(spaceId);
  return { title: space?.name ?? "Knowledge Base" };
}

export default async function SpacePage({ params }: Props) {
  const { spaceId } = await params;

  const [spaceRows, space, articleRows, connectionRows] = await Promise.all([
    findAllSpaces(),
    findSpaceById(spaceId),
    findArticlesBySpace(spaceId),
    findConnectionsBySpace(spaceId),
  ]);

  if (!space) notFound();

  const spaces: MapSpace[] = spaceRows.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    color: s.color,
    icon: s.icon,
    sortOrder: s.sortOrder,
  }));

  const articles: MapArticle[] = articleRows.map((a) => ({
    id: a.id,
    spaceId: a.spaceId,
    parentId: a.parentId,
    title: a.title,
    body: a.body,
    type: a.type,
    positionX: a.positionX,
    positionY: a.positionY,
    updatedAt: a.updatedAt.toISOString(),
  }));

  const connections: MapConnection[] = connectionRows.map((c) => ({
    id: c.id,
    fromId: c.fromId,
    toId: c.toId,
    type: c.type,
  }));

  return (
    <AppPage fullHeight>
      <KnowledgeBaseShell
        spaces={spaces}
        activeSpaceId={spaceId}
        articles={articles}
        connections={connections}
      />
    </AppPage>
  );
}
