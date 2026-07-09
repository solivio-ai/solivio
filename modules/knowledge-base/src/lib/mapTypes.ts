export type MapSpace = {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
};

export type MapArticle = {
  id: string;
  spaceId: string;
  parentId: string | null;
  title: string;
  body: string;
  type: string;
  positionX: number | null;
  positionY: number | null;
  updatedAt: string;
};

export type MapConnection = {
  id: string;
  fromId: string;
  toId: string;
  type: string;
};
