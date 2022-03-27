// @ts-ignore
import tool from 'firebase-tools'
import { Firestore } from '@google-cloud/firestore'

export function filter(db: Firestore) {
  return async function(name: string) {
    const collection = db.collection('/ranks')
    const snapshot = await collection.get()
    for (const rankSnap of snapshot.docs) {
      if (rankSnap.exists && rankSnap.ref.path.includes(name)) {
        console.log(`deleteing ${rankSnap.ref.path}`)
        await tool.firestore.delete(rankSnap.ref.path, {
          yes: true,
          recursive: true
        })
      }
    }
  }
}

export async function single(experience: string, location: string, mode: string, timeframe: string, revision: string) {
  await tool.firestore.delete(
    `/ranks/${experience}_${location}_${mode}_${timeframe}${revision ? `_${revision}` : ''}`,
    {
      yes: true,
      recursive: true
    }
  )
}
