/** 需要隐藏的节点 title */
const EXCLUDE_TITLES = ['嘿呦']

/* ============================================================
 * 数据层
 * ============================================================ */

/**
 * 递归过滤书签树：移除 title 在 excludeTitle 的节点。
 * 单次遍历完成过滤与深拷贝，不修改原数据。
 * @param {Array} nodes
 * @param {Array} excludeTitle
 * @returns {Array}
 */
function filterTree(nodes, excludeTitle) {
  if (!Array.isArray(nodes)) return []

  const result = []

  for (const item of nodes) {
    if (!item || typeof item !== 'object') continue
    if (excludeTitle.includes(item.title)) continue

    const next = { ...item }

    if (Array.isArray(item.children)) {
      next.children = filterTree(item.children, excludeTitle)
    }

    result.push(next)
  }

  return result
}

/**
 * 校验书签数据格式，返回合法节点数组或抛出错误。
 * @param {unknown} data
 * @returns {Array}
 */
function validateBookmarks(data) {
  if (!Array.isArray(data)) {
    throw new Error('bookmarks.json 顶层必须是数组')
  }

  const isValidNode = (node) =>
    node &&
    typeof node === 'object' &&
    typeof node.title === 'string' &&
    node.title.length > 0 &&
    (node.url === undefined || typeof node.url === 'string') &&
    (node.children === undefined || Array.isArray(node.children))

  const walk = (nodes) => {
    return nodes.every((node) => isValidNode(node) && (!node.children || walk(node.children)))
  }

  if (!walk(data, 0)) {
    throw new Error('bookmarks.json 节点格式不合法')
  }

  return data
}

/* ============================================================
 * 渲染层
 * ============================================================ */

/**
 * 将书签树渲染为 DocumentFragment。
 * 纯函数：不读写外部 DOM，便于测试与复用。
 * @param {Array} nodes
 * @param {number} level - 当前层级，从 1 开始
 * @returns {DocumentFragment}
 */
function renderTree(nodes) {
  const fragment = document.createDocumentFragment()

  for (const item of nodes) {
    const hasChildren = Array.isArray(item.children) && item.children.length > 0

    if (hasChildren) {
      const box = document.createElement('div')
      box.className = `mark-box`

      const node = document.createElement('div')
      node.className = 'mark-node'
      node.textContent = item.title
      box.appendChild(node)

      const items = document.createElement('div')
      items.className = 'mark-items'
      items.appendChild(renderTree(item.children))
      box.appendChild(items)

      fragment.appendChild(box)
    } else if (item.url) {
      const link = document.createElement('a')
      link.className = 'mark-text'
      link.textContent = item.title
      link.href = item.url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      link.title = item.url
      fragment.appendChild(link)
    }
  }

  return fragment
}

/* ============================================================
 * UI 状态
 * ============================================================ */

const app = document.getElementById('app')

/* ============================================================
 * 启动
 * ============================================================ */

async function loadBookmarks() {
  const res = await fetch('./assets/bookmarks.json', { cache: 'no-cache' })
  if (!res.ok) {
    throw new Error(`请求失败：HTTP ${res.status}`)
  }
  const data = await res.json()
  return validateBookmarks(data)
}

async function bootstrap() {
  // await new Promise((resolve) => setTimeout(resolve, 1000))

  try {
    const data = await loadBookmarks()
    const reversed = data[0]['children'].toReversed()
    const cleaned = filterTree(reversed, EXCLUDE_TITLES)

    app.innerHTML = ''
    app.appendChild(renderTree(cleaned))
  } catch (err) {
    console.error('[Rainte] 书签加载失败：', err)
  }
}

// 立即执行
bootstrap()
