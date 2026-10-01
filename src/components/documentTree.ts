import type { DocumentId, DocumentSummary } from '@/models/document'

export interface SidebarDocumentNode {
  document: DocumentSummary
  children: SidebarDocumentNode[]
}

export interface SidebarDocumentForest {
  rootNodes: SidebarDocumentNode[]
  nodesByGroup: Map<DocumentId, SidebarDocumentNode[]>
}

export function buildSidebarDocumentForest(documents: DocumentSummary[]): SidebarDocumentForest {
  const groups = new Set(
    documents
      .filter((document) => document.documentKind === 'group')
      .map((document) => document.id),
  )
  const articles = documents.filter((document) => document.documentKind === 'article')
  const articleById = new Map(articles.map((document) => [document.id, document]))
  const parentArticleIds = new Map<DocumentId, DocumentId | null>()

  for (const article of articles) {
    parentArticleIds.set(article.id, resolveParentArticleId(article, articleById))
  }

  const childrenByParent = new Map<DocumentId, DocumentSummary[]>()
  const rootArticles: DocumentSummary[] = []
  const rootArticlesByGroup = new Map<DocumentId, DocumentSummary[]>()

  for (const article of articles) {
    const parentArticleId = parentArticleIds.get(article.id) ?? null
    if (parentArticleId) {
      const children = childrenByParent.get(parentArticleId) ?? []
      children.push(article)
      childrenByParent.set(parentArticleId, children)
      continue
    }

    if (article.parentId && groups.has(article.parentId)) {
      const groupArticles = rootArticlesByGroup.get(article.parentId) ?? []
      groupArticles.push(article)
      rootArticlesByGroup.set(article.parentId, groupArticles)
    } else {
      rootArticles.push(article)
    }
  }

  const createNodes = (items: DocumentSummary[]): SidebarDocumentNode[] =>
    items.map((document) => ({
      document,
      children: createNodes(childrenByParent.get(document.id) ?? []),
    }))

  return {
    rootNodes: createNodes(rootArticles),
    nodesByGroup: new Map(
      Array.from(rootArticlesByGroup, ([groupId, groupArticles]) => [
        groupId,
        createNodes(groupArticles),
      ]),
    ),
  }
}

export function countSidebarDocumentNodes(nodes: SidebarDocumentNode[]): number {
  return nodes.reduce((count, node) => count + 1 + countSidebarDocumentNodes(node.children), 0)
}

export function collectArticleDescendants(
  documents: DocumentSummary[],
  parentId: DocumentId,
): DocumentSummary[] {
  const childrenByParent = new Map<DocumentId, DocumentSummary[]>()

  for (const document of documents) {
    if (document.documentKind !== 'article' || document.parentId === null) continue
    const children = childrenByParent.get(document.parentId) ?? []
    children.push(document)
    childrenByParent.set(document.parentId, children)
  }

  const descendants: DocumentSummary[] = []
  const visited = new Set<DocumentId>([parentId])

  const visit = (currentParentId: DocumentId): void => {
    for (const child of childrenByParent.get(currentParentId) ?? []) {
      if (visited.has(child.id)) continue
      visited.add(child.id)
      descendants.push(child)
      visit(child.id)
    }
  }

  visit(parentId)
  return descendants
}

function resolveParentArticleId(
  article: DocumentSummary,
  articleById: Map<DocumentId, DocumentSummary>,
): DocumentId | null {
  if (!article.parentId || !articleById.has(article.parentId)) return null

  const directParentId = article.parentId
  const visited = new Set<DocumentId>([article.id])
  let cursorId: DocumentId | null = directParentId

  while (cursorId) {
    if (visited.has(cursorId)) return null
    visited.add(cursorId)

    const cursor = articleById.get(cursorId)
    if (!cursor || !cursor.parentId || !articleById.has(cursor.parentId)) break
    cursorId = cursor.parentId
  }

  return directParentId
}
