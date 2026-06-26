import { BookOpen } from "lucide-react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { AppPage } from "@solivio/ui/components/app-page.tsx";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@solivio/ui/components/empty.tsx";

import { CreateFirstSpaceButton } from "../../components/CreateFirstSpaceButton.tsx";
import { findAllSpaces } from "../../server/knowledgeBaseRepository.ts";

export default async function KnowledgeBasePage() {
  const [spaces, t] = await Promise.all([findAllSpaces(), getTranslations("knowledge-base.page")]);

  if (spaces.length > 0) {
    redirect(`/knowledge-base/${spaces[0].id}`);
  }

  return (
    <AppPage>
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <BookOpen />
          </EmptyMedia>
          <EmptyTitle>{t("emptySpaces.title")}</EmptyTitle>
          <EmptyDescription>{t("emptySpaces.description")}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <CreateFirstSpaceButton />
        </EmptyContent>
      </Empty>
    </AppPage>
  );
}
