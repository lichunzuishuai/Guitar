import type { ApiResponse, ScoreDocument } from './score-types';

const scoreApiBaseUrl =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api';

/**
 * 请求曲谱列表。
 *
 * @returns 已保存曲谱列表
 */
export async function fetchScoreList(): Promise<ScoreDocument[]> {
  const response = await fetch(`${scoreApiBaseUrl}/scores`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error('曲谱列表请求失败');
  }

  const result = (await response.json()) as ApiResponse<ScoreDocument[]>;
  return result.data;
}

/**
 * 创建一份新的曲谱。
 *
 * @param template 曲谱初始模板
 * @returns 新曲谱
 */
export async function createScore(
  template: 'blank' | 'demo',
): Promise<ScoreDocument> {
  const response = await fetch(`${scoreApiBaseUrl}/scores`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ template }),
  });
  if (!response.ok) {
    throw new Error('创建曲谱失败');
  }

  const result = (await response.json()) as ApiResponse<ScoreDocument>;
  return result.data;
}

/**
 * 保存曲谱内容。
 *
 * @param scoreId 曲谱 ID
 * @param score 待保存曲谱
 * @returns 服务端保存后的曲谱
 */
export async function updateScore(
  scoreId: string,
  score: Pick<ScoreDocument, 'title' | 'artist' | 'tempo' | 'measures'>,
): Promise<ScoreDocument> {
  const response = await fetch(`${scoreApiBaseUrl}/scores/${scoreId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(score),
  });
  if (!response.ok) {
    throw new Error('保存曲谱失败');
  }

  const result = (await response.json()) as ApiResponse<ScoreDocument>;
  return result.data;
}
