import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp,
  Timestamp,
  deleteDoc,
  doc
} from "firebase/firestore";
import { db, auth } from "../firebase/firebase.config";

export interface HistoryItem {
  id: string;
  url: string;
  mode: "page" | "sequence";
  imageCount: number;
  timestamp: Date;
  fileName: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export class HistoryRepository {
  private collectionName = "history";

  async add(item: Omit<HistoryItem, "id" | "timestamp">): Promise<void> {
    if (!auth.currentUser) return;

    try {
      await addDoc(collection(db, this.collectionName), {
        ...item,
        userId: auth.currentUser.uid,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, this.collectionName);
    }
  }

  subscribe(onUpdate: (items: HistoryItem[]) => void): () => void {
    if (!auth.currentUser) return () => {};

    const q = query(
      collection(db, this.collectionName),
      where("userId", "==", auth.currentUser.uid),
      orderBy("timestamp", "desc")
    );

    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          url: data.url,
          mode: data.mode,
          imageCount: data.imageCount,
          fileName: data.fileName,
          timestamp: (data.timestamp as Timestamp)?.toDate() || new Date(),
        };
      });
      onUpdate(items);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, this.collectionName);
    });
  }

  async delete(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `${this.collectionName}/${id}`);
    }
  }
}
