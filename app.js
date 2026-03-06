/**
 * Grandma KTV - 純 JS 版
 * 歌曲資料、播放器、路由、DOM 渲染
 */

const STORE_KEY = 'grandma_ktv_songs'

const defaultSongs = [
  { title: 'Sample 1', artist: 'Demo Artist', yt: 'dQw4w9WgXcQ', cover: '' },
  { title: 'Sample 2', artist: 'Demo Artist', yt: 'yebNIHKAC4A', cover: '' },
  { title: 'Sample 3', artist: 'Demo Artist', yt: '9bZkp7q19f0', cover: '' },
]

// ---------- 歌曲 Store ----------
function loadSongs() {
  const raw = localStorage.getItem(STORE_KEY)
  if (raw) {
    try {
      const arr = JSON.parse(raw)
      if (Array.isArray(arr)) return arr
    } catch (e) {
      console.error('Failed to parse songs from localStorage:', e)
    }
  }
  localStorage.setItem(STORE_KEY, JSON.stringify(defaultSongs))
  return defaultSongs
}

function saveSongs(songs) {
  localStorage.setItem(STORE_KEY, JSON.stringify(songs))
}

function getYouTubeThumbnail(id) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

function parseYouTubeId(input) {
  if (!input) return ''
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input
  try {
    const url = new URL(input)
    if (url.hostname.includes('youtu.be')) return url.pathname.slice(1)
    if (url.hostname.includes('youtube.com')) {
      if (url.searchParams.get('v')) return url.searchParams.get('v')
      const match = url.pathname.match(/\/embed\/([a-zA-Z0-9_-]{11})/)
      if (match) return match[1]
    }
  } catch (e) {
    console.error('Failed to parse YouTube URL:', e)
  }
  return input.trim()
}

let songs = loadSongs()
let editIndex = -1

function getSongThumbnail(song) {
  return song.cover || getYouTubeThumbnail(song.yt)
}

function addSong(songData) {
  const newSong = {
    title: songData.title || '未命名',
    artist: songData.artist || '',
    yt: parseYouTubeId(songData.yt || ''),
    cover: songData.cover || '',
  }
  if (!newSong.yt) throw new Error('請輸入正確的 YouTube 連結或ID')
  songs.unshift(newSong)
  saveSongs(songs)
}

function updateSong(index, songData) {
  const updatedSong = {
    title: songData.title || '未命名',
    artist: songData.artist || '',
    yt: parseYouTubeId(songData.yt || ''),
    cover: songData.cover || '',
  }
  if (!updatedSong.yt) throw new Error('請輸入正確的 YouTube 連結或ID')
  songs[index] = updatedSong
  saveSongs(songs)
}

function deleteSong(index) {
  songs.splice(index, 1)
  saveSongs(songs)
}

function exportSongs() {
  const blob = new Blob([JSON.stringify(songs, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'ktv-songs.json'
  a.click()
  URL.revokeObjectURL(url)
}

function importSongs(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!Array.isArray(data)) throw new Error('格式不正確')
        songs = data
          .map((item) => ({
            title: item.title || item.name || '未命名',
            artist: item.artist || item.singer || '',
            yt: parseYouTubeId(item.yt || item.youtube || item.youtubeId || ''),
            cover: item.cover || item.coverUrl || '',
          }))
          .filter((song) => song.yt)
        saveSongs(songs)
        resolve(songs)
      } catch (error) {
        reject(new Error('匯入失敗：' + error.message))
      }
    }
    reader.onerror = () => reject(new Error('檔案讀取失敗'))
    reader.readAsText(file)
  })
}

// ---------- 播放器（自建 iframe + referrerPolicy 以避免錯誤 153）----------
let currentIndex = -1
let currentSong = null

function showOverlay() {
  document.getElementById('player-overlay').classList.remove('hidden')
}

function hideOverlay() {
  document.getElementById('player-overlay').classList.add('hidden')
}

function closePlayer() {
  const container = document.getElementById('yt-frame')
  if (container) container.innerHTML = ''
  currentIndex = -1
  currentSong = null
  hideOverlay()
}

function playSong(song, index) {
  currentIndex = index
  currentSong = song
  showOverlay()

  const thumb = document.getElementById('player-thumb')
  const titleEl = document.getElementById('player-title')
  const artistEl = document.getElementById('player-artist')
  thumb.src = getSongThumbnail(song)
  thumb.alt = song.title || ''
  thumb.classList.remove('hidden')
  titleEl.textContent = song.title || '未命名'
  artistEl.textContent = song.artist || ''

  const container = document.getElementById('yt-frame')
  container.innerHTML = ''
  const iframe = document.createElement('iframe')
  // 使用 youtube-nocookie.com 可避免錯誤 153（需有效 referrer；file:// 仍可能失敗，請用本地 HTTP 伺服器）
  iframe.setAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/' +
      encodeURIComponent(song.yt) +
      '?autoplay=1&rel=0&modestbranding=1&playsinline=1'
  )
  iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  iframe.setAttribute(
    'allow',
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share'
  )
  iframe.setAttribute('allowfullscreen', '')
  iframe.setAttribute('title', 'YouTube video player')
  iframe.className = 'yt-embed-iframe'
  container.appendChild(iframe)
}

// ---------- 路由 ----------
function getRoute() {
  const hash = window.location.hash.slice(1) || '/'
  return hash === '' ? '/' : hash
}

function setActiveNav(path) {
  document.querySelectorAll('.nav-link').forEach((a) => {
    a.classList.toggle('active', a.getAttribute('data-route') === path)
  })
}

function showView(viewId) {
  document.querySelectorAll('.view').forEach((el) => el.classList.add('hidden'))
  const view = document.getElementById(viewId)
  if (view) view.classList.remove('hidden')
}

function render() {
  const path = getRoute()
  setActiveNav(path)

  if (path === '/') {
    showView('view-home')
    renderHome()
  } else if (path === '/admin') {
    showView('view-admin')
    renderAdmin()
  }
}

// ---------- 首頁：歌曲卡片 ----------
function renderHome() {
  const grid = document.getElementById('song-grid')
  const emptyState = document.getElementById('empty-state')
  grid.innerHTML = ''

  if (songs.length === 0) {
    emptyState.classList.remove('hidden')
    return
  }
  emptyState.classList.add('hidden')

  songs.forEach((song, index) => {
    const card = document.createElement('article')
    card.className = 'song-card'
    const thumb = getSongThumbnail(song)
    card.innerHTML = `
      <div class="song-card-poster">
        <img src="${thumb}" alt="${escapeHtml(song.title || '')}" loading="lazy" />
      </div>
      <div class="song-card-title">${escapeHtml(song.title || '未命名')}</div>
      <div class="song-card-artist">${escapeHtml(song.artist || '')}</div>
    `
    card.addEventListener('click', () => playSong(song, index))
    grid.appendChild(card)
  })
}

// ---------- 管理頁：表單 + 表格 ----------
function renderAdmin() {
  renderSongTable()
  syncFormFromEditIndex()
}

function renderSongTable() {
  const tbody = document.getElementById('song-table-body')
  tbody.innerHTML = ''

  if (songs.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="table-empty">尚無影片，請從上方表單新增。</td></tr>'
    return
  }

  songs.forEach((song, index) => {
    const thumb = getSongThumbnail(song)
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td><img src="${thumb}" alt="${escapeHtml(song.title || '')}" /></td>
      <td class="cell-title">${escapeHtml(song.title || '')}</td>
      <td>${escapeHtml(song.artist || '')}</td>
      <td><code>${escapeHtml(song.yt || '')}</code></td>
      <td>
        <button type="button" class="btn-edit" data-index="${index}">編輯</button>
        <button type="button" class="btn-delete" data-index="${index}">刪除</button>
      </td>
    `
    tr.querySelector('.btn-edit').addEventListener('click', () => {
      editIndex = index
      syncFormFromEditIndex()
      document.getElementById('song-form').scrollIntoView({ behavior: 'smooth' })
    })
    tr.querySelector('.btn-delete').addEventListener('click', () => {
      if (window.confirm('確定要刪除這首歌曲？')) {
        deleteSong(index)
        if (editIndex === index) editIndex = -1
        else if (editIndex > index) editIndex--
        renderSongTable()
        syncFormFromEditIndex()
      }
    })
    tbody.appendChild(tr)
  })
}

function syncFormFromEditIndex() {
  const titleEl = document.getElementById('form-title')
  const artistEl = document.getElementById('form-artist')
  const ytEl = document.getElementById('form-yt')
  const coverEl = document.getElementById('form-cover')
  const submitBtn = document.getElementById('btn-submit')
  const resetBtn = document.getElementById('btn-reset')
  const cancelBtn = document.getElementById('btn-cancel')

  if (editIndex > -1 && songs[editIndex]) {
    const song = songs[editIndex]
    titleEl.value = song.title || ''
    artistEl.value = song.artist || ''
    ytEl.value = song.yt || ''
    coverEl.value = song.cover || ''
    submitBtn.textContent = '更新'
    cancelBtn.classList.remove('hidden')
    resetBtn.classList.add('hidden')
  } else {
    titleEl.value = ''
    artistEl.value = ''
    ytEl.value = ''
    coverEl.value = ''
    submitBtn.textContent = '新增歌曲'
    cancelBtn.classList.add('hidden')
    resetBtn.classList.remove('hidden')
  }
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// ---------- 表單送出 ----------
document.getElementById('song-form').addEventListener('submit', (e) => {
  e.preventDefault()
  const title = document.getElementById('form-title').value
  const artist = document.getElementById('form-artist').value
  const yt = document.getElementById('form-yt').value
  const cover = document.getElementById('form-cover').value
  try {
    if (editIndex > -1) {
      updateSong(editIndex, { title, artist, yt, cover })
      editIndex = -1
    } else {
      addSong({ title, artist, yt, cover })
    }
    syncFormFromEditIndex()
    renderSongTable()
  } catch (error) {
    window.alert(error.message)
  }
})

document.getElementById('btn-reset').addEventListener('click', () => {
  editIndex = -1
  syncFormFromEditIndex()
})

document.getElementById('btn-cancel').addEventListener('click', () => {
  editIndex = -1
  syncFormFromEditIndex()
})

// ---------- 匯出 / 匯入 ----------
document.getElementById('btn-export').addEventListener('click', exportSongs)

document.getElementById('input-import').addEventListener('change', async (e) => {
  const file = e.target.files[0]
  if (!file) return
  try {
    await importSongs(file)
    renderSongTable()
    syncFormFromEditIndex()
    window.alert('匯入成功！')
  } catch (error) {
    window.alert(error.message)
  }
  e.target.value = ''
})

// ---------- 播放器按鈕（自建 iframe 無 API，僅保留結束鈕）----------
document.getElementById('btn-close-player').addEventListener('click', closePlayer)

// ---------- 路由監聽 ----------
window.addEventListener('hashchange', render)

// ---------- 初始化 ----------
render()
