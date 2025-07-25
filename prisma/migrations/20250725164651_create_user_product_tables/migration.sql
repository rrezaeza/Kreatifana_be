-- AlterTable
ALTER TABLE "_ProductToTag" ADD CONSTRAINT "_ProductToTag_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_ProductToTag_AB_unique";

-- AlterTable
ALTER TABLE "_UserFollows" ADD CONSTRAINT "_UserFollows_AB_pkey" PRIMARY KEY ("A", "B");

-- DropIndex
DROP INDEX "_UserFollows_AB_unique";
