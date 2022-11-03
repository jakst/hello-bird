import { randomUUID } from 'node:crypto'
import { getItems } from './bot/actions'

let db: Map<string, Item> | null = null
let dbPromise: Promise<Map<string, Item>> | null = null

interface Item {
  id: string
  index: number
  name: string
  checked: boolean
}

async function fillDb() {
  const items = await getItems()

  const _db = new Map<string, Item>()
  items.forEach(({ index, name, checked }) => {
    const id = randomUUID()
    _db.set(id, { id, index, name, checked })
  })

  return _db
}

fillDb()

export async function getDb() {
  if (!dbPromise) {
    console.log('Initing DB...')

    dbPromise = fillDb()
    db = await dbPromise

    console.log('DB init finished!')
  } else if (!db) {
    db = await dbPromise
  }

  return db
}
