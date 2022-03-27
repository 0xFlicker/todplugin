import { Firestore } from '@google-cloud/firestore'

export function filter(db: Firestore) {
  return async function(name: string, inMaintenance: boolean) {
    const collection = db.collection('/ranks')
    const snapshot = await collection.get()
    for (const rankSnap of snapshot.docs) {
      if (rankSnap.exists && rankSnap.ref.path.includes(name)) {
        const doc = db.doc(rankSnap.ref.path.replace(`/ranks/`, '/leaderboardMaintenance'))
        await doc.set({
          maintenance: inMaintenance
        }, {
          merge: true
        })
      }
    }
  }
}

export function single (db: Firestore) {
  return async function(experience: string, location: string, mode: string, timeframe: string, inMaintenance: boolean) {
    const doc = db.doc(`/leaderboardMaintenance/${experience}_${location}_${mode}_${timeframe}`)
    const snapshot = await doc.get()
    if (snapshot.exists) {
      await doc.set({
        maintenance: inMaintenance
      }, {
        merge: true
      })
    }
  }
}