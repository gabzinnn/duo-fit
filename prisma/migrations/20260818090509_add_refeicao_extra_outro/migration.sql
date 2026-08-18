-- AlterEnum
ALTER TYPE "TipoRefeicao" ADD VALUE 'OUTRO';

-- AlterTable
ALTER TABLE "Refeicao" ADD COLUMN "nome" TEXT,
ADD COLUMN "icone" TEXT;
