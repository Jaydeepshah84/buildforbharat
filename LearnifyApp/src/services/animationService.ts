// Placeholder — animation service not used in current video-based approach
// Kept for backward compatibility

export function hasLocalAnimation(_topicId: string): boolean {
  return false;
}

export async function getLocalAnimation(_topicId: string): Promise<any> {
  return null;
}

export function deleteTopicAnimation(_topicId: string): void {}
