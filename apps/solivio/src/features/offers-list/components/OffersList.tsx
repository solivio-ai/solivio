import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type OfferRow = {
  id: string;
  customerName: string | null;
  status: string;
  totalPrice: number;
  createdAt: Date;
};

type Props = {
  offers: OfferRow[];
  hideHeader?: boolean;
};

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatNumber(amount: number) {
  return new Intl.NumberFormat("en-GB", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function OffersList({ offers, hideHeader }: Props) {
  return (
    <div>
      {!hideHeader && (
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">Offers</h1>
          <Button asChild size="sm">
            <Link href="/offers/new">
              <Plus size={16} aria-hidden="true" />
              New offer
            </Link>
          </Button>
        </div>
      )}

      {hideHeader && (
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Recent Offers</h2>
      )}

      {offers.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileText />
            </EmptyMedia>
            <EmptyTitle>No offers yet</EmptyTitle>
            <EmptyDescription>
              Generate structured offer drafts based on your customer requests.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/offers/new">
                <Plus size={16} aria-hidden="true" />
                New offer
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Price</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[80px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {offers.map((offer) => (
              <TableRow key={offer.id}>
                <TableCell className="font-medium">{offer.customerName || "—"}</TableCell>
                <TableCell>
                  <Badge variant={offer.status === "accepted" ? "default" : "secondary"} className="capitalize">
                    {offer.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatNumber(offer.totalPrice)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(offer.createdAt)}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(offer.updatedAt)}
                </TableCell>
                <TableCell>
                  <Button asChild variant="ghost" size="sm">
                    <Link href={`/offers/${offer.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
