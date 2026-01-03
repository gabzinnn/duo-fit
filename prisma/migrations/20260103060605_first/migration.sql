-- CreateEnum
CREATE TYPE "CorUsuario" AS ENUM ('AMARELO', 'ROXO');

-- CreateEnum
CREATE TYPE "TipoExercicio" AS ENUM ('ACADEMIA', 'CARDIO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TipoRefeicao" AS ENUM ('CAFE_DA_MANHA', 'ALMOCO', 'JANTAR', 'LANCHE');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha" TEXT NOT NULL,
    "avatar" TEXT,
    "cor" "CorUsuario" NOT NULL,
    "metaCalorias" DOUBLE PRECISION NOT NULL DEFAULT 2000,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Desafio" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL DEFAULT 'Desafio Fitness',
    "pessoa1Id" INTEGER NOT NULL,
    "pessoa2Id" INTEGER NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Desafio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sequencia" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "sequenciaAtual" INTEGER NOT NULL DEFAULT 0,
    "maiorSequencia" INTEGER NOT NULL DEFAULT 0,
    "ultimaData" TIMESTAMP(3) NOT NULL,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sequencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Exercicio" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoExercicio" NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "duracao" INTEGER NOT NULL,
    "pontos" INTEGER NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Exercicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alimento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "calorias" DOUBLE PRECISION NOT NULL,
    "proteinas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carboidratos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gorduras" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "icone" TEXT,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refeicao" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" "TipoRefeicao" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "totalCalorias" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalProteinas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCarbos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalGorduras" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refeicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlimentoRefeicao" (
    "id" SERIAL NOT NULL,
    "refeicaoId" INTEGER NOT NULL,
    "alimentoId" INTEGER NOT NULL,
    "quantidade" DOUBLE PRECISION NOT NULL,
    "unidade" TEXT NOT NULL DEFAULT 'g',
    "calorias" DOUBLE PRECISION NOT NULL,
    "proteinas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carboidratos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gorduras" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "AlimentoRefeicao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaloriasDiarias" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "metaCalorias" DOUBLE PRECISION NOT NULL,
    "caloriasIngeridas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "proteinas" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carboidratos" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gorduras" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "metaAtingida" BOOLEAN NOT NULL DEFAULT false,
    "metadeAtingida" BOOLEAN NOT NULL DEFAULT false,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CaloriasDiarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PontuacaoDiaria" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    "pontosExercicios" INTEGER NOT NULL DEFAULT 0,
    "pontosCalorias" INTEGER NOT NULL DEFAULT 0,
    "pontosAgua" INTEGER NOT NULL DEFAULT 0,
    "pontosTotais" INTEGER NOT NULL DEFAULT 0,
    "atualizadoEm" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PontuacaoDiaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Atividade" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "pontos" INTEGER NOT NULL,
    "icone" TEXT,
    "referenciaId" INTEGER,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Atividade_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Sequencia_usuarioId_key" ON "Sequencia"("usuarioId");

-- CreateIndex
CREATE INDEX "Exercicio_usuarioId_data_idx" ON "Exercicio"("usuarioId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "Alimento_nome_key" ON "Alimento"("nome");

-- CreateIndex
CREATE INDEX "Refeicao_usuarioId_data_idx" ON "Refeicao"("usuarioId", "data");

-- CreateIndex
CREATE INDEX "AlimentoRefeicao_refeicaoId_idx" ON "AlimentoRefeicao"("refeicaoId");

-- CreateIndex
CREATE INDEX "CaloriasDiarias_usuarioId_data_idx" ON "CaloriasDiarias"("usuarioId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "CaloriasDiarias_usuarioId_data_key" ON "CaloriasDiarias"("usuarioId", "data");

-- CreateIndex
CREATE INDEX "PontuacaoDiaria_usuarioId_data_idx" ON "PontuacaoDiaria"("usuarioId", "data");

-- CreateIndex
CREATE UNIQUE INDEX "PontuacaoDiaria_usuarioId_data_key" ON "PontuacaoDiaria"("usuarioId", "data");

-- CreateIndex
CREATE INDEX "Atividade_usuarioId_data_idx" ON "Atividade"("usuarioId", "data");

-- AddForeignKey
ALTER TABLE "Desafio" ADD CONSTRAINT "Desafio_pessoa1Id_fkey" FOREIGN KEY ("pessoa1Id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Desafio" ADD CONSTRAINT "Desafio_pessoa2Id_fkey" FOREIGN KEY ("pessoa2Id") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sequencia" ADD CONSTRAINT "Sequencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exercicio" ADD CONSTRAINT "Exercicio_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refeicao" ADD CONSTRAINT "Refeicao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlimentoRefeicao" ADD CONSTRAINT "AlimentoRefeicao_refeicaoId_fkey" FOREIGN KEY ("refeicaoId") REFERENCES "Refeicao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlimentoRefeicao" ADD CONSTRAINT "AlimentoRefeicao_alimentoId_fkey" FOREIGN KEY ("alimentoId") REFERENCES "Alimento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaloriasDiarias" ADD CONSTRAINT "CaloriasDiarias_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PontuacaoDiaria" ADD CONSTRAINT "PontuacaoDiaria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
