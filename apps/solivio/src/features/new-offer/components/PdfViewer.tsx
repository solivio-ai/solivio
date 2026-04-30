"use client";

import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

type PdfViewerProps = {
  url: string;
  title?: string;
};

export function PdfViewer({ url, title }: PdfViewerProps) {
  const t = useTranslations("NewOffer.review.acceptedView.pdfViewer");
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.2);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  return (
    <div className="flex h-full flex-col items-center overflow-auto bg-muted/40 [scrollbar-gutter:stable] [scrollbar-width:thin]">
      <div className="sticky top-0 z-10 flex w-full items-center justify-between border-b bg-card px-3 py-1.5 shadow-sm">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={scale <= 0.6}
            onClick={() => setScale((s) => Math.max(0.6, s - 0.2))}
            aria-label={t("zoomOut")}
          >
            <ZoomOut size={14} />
          </Button>
          <span className="min-w-10 text-center text-xs text-muted-foreground">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={scale >= 2.5}
            onClick={() => setScale((s) => Math.min(2.5, s + 0.2))}
            aria-label={t("zoomIn")}
          >
            <ZoomIn size={14} />
          </Button>
        </div>

        {numPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber((p) => p - 1)}
              aria-label={t("previousPage")}
            >
              <ChevronLeft size={14} />
            </Button>
            <span className="text-xs text-muted-foreground">
              {pageNumber} / {numPages}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber((p) => p + 1)}
              aria-label={t("nextPage")}
            >
              <ChevronRight size={14} />
            </Button>
          </div>
        )}
      </div>

      <div className="p-4">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex h-96 w-64 items-center justify-center text-sm text-muted-foreground">
              {t("loading")}
            </div>
          }
          error={
            <div className="flex h-96 w-64 items-center justify-center text-sm text-destructive">
              {t("error")}
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer
            renderAnnotationLayer
            className="shadow-md"
          />
        </Document>
      </div>
    </div>
  );
}
