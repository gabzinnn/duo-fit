import prisma from "./src/lib/prisma"

async function main() {
  const rows = await prisma.alimento.findMany({
    select: { id: true, nome: true, pesoUnidade: true },
    orderBy: { nome: "asc" },
  })
  console.log(JSON.stringify(rows, null, 2))
  console.log("TOTAL:", rows.length)
  process.exit(0)
}
main()
