export interface GuitarSampleRecord {
  id: string;
  name: string;
  stringIndex: number;
  fret: number;
  mimeType: string;
  audioData: ArrayBuffer;
  importedAt: string;
}

const databaseName = 'stringline-audio';
const databaseVersion = 1;
const sampleStoreName = 'guitar-samples';

function openGuitarSampleDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(sampleStoreName)) {
        database.createObjectStore(sampleStoreName, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

/**
 * 读取浏览器中已保存的吉他采样。
 *
 * @returns 按琴弦和品位排序的采样列表
 */
export async function listGuitarSamples(): Promise<GuitarSampleRecord[]> {
  const database = await openGuitarSampleDatabase();
  try {
    const transaction = database.transaction(sampleStoreName, 'readonly');
    const transactionComplete = waitForTransaction(transaction);
    const request = transaction
      .objectStore(sampleStoreName)
      .getAll() as IDBRequest<GuitarSampleRecord[]>;
    const samples = await new Promise<GuitarSampleRecord[]>(
      (resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      },
    );
    await transactionComplete;
    return samples.sort(
      (firstSample, secondSample) =>
        secondSample.stringIndex - firstSample.stringIndex ||
        firstSample.fret - secondSample.fret,
    );
  } finally {
    database.close();
  }
}

/**
 * 保存或覆盖一批吉他采样。
 *
 * @param samples 待保存采样
 */
export async function saveGuitarSamples(
  samples: GuitarSampleRecord[],
): Promise<void> {
  const database = await openGuitarSampleDatabase();
  try {
    const transaction = database.transaction(sampleStoreName, 'readwrite');
    const transactionComplete = waitForTransaction(transaction);
    const sampleStore = transaction.objectStore(sampleStoreName);
    samples.forEach((sample) => sampleStore.put(sample));
    await transactionComplete;
  } finally {
    database.close();
  }
}

/**
 * 删除指定吉他采样。
 *
 * @param sampleId 采样 ID
 */
export async function deleteGuitarSample(sampleId: string): Promise<void> {
  const database = await openGuitarSampleDatabase();
  try {
    const transaction = database.transaction(sampleStoreName, 'readwrite');
    const transactionComplete = waitForTransaction(transaction);
    transaction.objectStore(sampleStoreName).delete(sampleId);
    await transactionComplete;
  } finally {
    database.close();
  }
}
