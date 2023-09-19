const sources = [
  '//down.eebbk.net/xzzx/y100/3/中国文化之文学.MSG',
  '//down.eebbk.net/xzza/y100/时事政治.MSG',
  '//down.eebbk.net/xzzx/y100/3/从黄冈中学走向北大清华.MSP',
  '//down.eebbk.net/xzzx/y100/3/中国文化之神话传说.MSG',
  '//down.eebbk.net/xzzx/y100/3/中国文化之民族节日.MSG',
  '//down.eebbk.net/xzzx/y100/3/中国文化之民俗文化.MSG',
  '//down.eebbk.net/xzzx/y100/3/中国文化之古代科技.MSG',
  '//down.eebbk.net/xzzx/y100/3/中国文化之古代建筑.MSG',
  '//down.eebbk.net/xzzx/y100/3/中国文化之典章制度.MSG',
  '//down.eebbk.net/xzzx/y100/3/中国文化之当代中国.MSG',
  '//down.eebbk.net/xzzx/y100/3/世界知识.MSG',
  '//down.eebbk.net/xzzx/y100/3/绘画知识.MSG',
  '//down.eebbk.net/xzzx/y100/3/中国文化之语言文字.MSG',
  '//down.eebbk.net/xzzx/y100/3/中国文化之艺术.MSG',
  '//down.eebbk.net/xzzx/y100/3/中国文化之文化典籍.MSG',
  '//down.eebbk.net/xzzx/y100/3/中国文化之思想学术.MSG',
  '//down.eebbk.net/xzza/y100/地理名胜.MSP',
  '//down.eebbk.net/xzzx/y100/3/数学故事.MSP',
  '//down.eebbk.net/xzzx/y100/3/英语赏析.MSG',
  '//down.eebbk.net/xzzx/y100/3/历史年表资料.MSP',
  '//down.eebbk.net/xzza/y100/法律常识.MSG' //
];
const catalog = sources.map(a => a.split('/').pop().split('.')[0]);
const params = new URLSearchParams(location.search);
const path = params.get('path');
async function main() {
  const headerEl = document.createElement('div');
  headerEl.classList.add('header');
  document.body.appendChild(headerEl);
  const pageEl = document.createElement('div');
  pageEl.classList.add('page');
  document.body.appendChild(pageEl);
  const footerEl = document.createElement('div');
  footerEl.classList.add('footer');
  const footerBtns = [];
  if (path != null && path !== '') {
    footerBtns.push({ name: '返回', path: path.split('.').slice(0, -1).join('.') });
  }
  footerEl.innerHTML = footerBtns.map(a => `<a href="?path=${a.path}">${a.name}</a>`).join('');
  document.body.appendChild(footerEl);
  if (path == null || path === '') {
    const maps = catalog.map((a, i) => (params.set('path', i), `<li><a href="?${params.toString()}">${a}</a></li>`));
    headerEl.innerHTML = `<h1>精品阅读</h1>`;
    pageEl.innerHTML = `<p><ul>${maps.join('')}</ul></p>`;
    return;
  }
  const src = sources[path.split('.')[0]];
  if (src == null) {
    alert(path + ' not found (-1)');
    params.delete('path');
    location.search = params.toString();
    return;
  }
  const raw = await fetch(src).then(a => a.arrayBuffer());
  console.log(raw);
  const dataView = new DataView(raw);
  const textDecoder = new TextDecoder('gb2312', { fatal: true });
  let globalOffset = 0;
  const uint32 = offset => {
    const ret = dataView.getUint32(offset, true);
    globalOffset = offset + 4;
    return ret;
  };
  const uint16 = offset => {
    const ret = dataView.getUint16(offset, true);
    globalOffset = offset + 2;
    return ret;
  };
  const getString = (offset, len) => {
    const ret = textDecoder.decode(raw.slice(offset, offset + len));
    globalOffset = offset + len;
    return ret;
  };

  const header1 = uint32(globalOffset);
  const header2 = uint32(globalOffset);
  console.log('0x00-0x07', header1.toString(16).padStart(8, '0'), header2.toString(16).padStart(8, '0'));
  const size = uint32(globalOffset);
  console.log('size', size);
  const format = getString(globalOffset, 12).replace(/\0+$/, '');
  console.log('format', format);
  const header3 = uint32(globalOffset);
  console.log('0x18-0x1b', header3.toString(16).padStart(8, '0'));
  const name = getString(globalOffset, 32);
  console.log('name', name);
  const copyright = getString(globalOffset, 16);
  console.log('copyright', copyright);
  const data = getString(globalOffset, 20);
  console.log('data', data);
  const imgStart = uint32(globalOffset);
  console.log('imgStart', imgStart);
  const magic = '\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00€\x00\x00\x00';
  if (magic !== getString(globalOffset, 32)) throw new Error('magic not match');
  const pageSize = uint32(globalOffset);
  console.log('pageSize', pageSize);
  const pages = readPages(pageSize);
  console.log('pages', pages);
  const getImage = getImageFn();
  const subPath = path.split('.').slice(1).join('.');
  if (subPath === '') {
    const maps = pages.map((a, i) => (params.set('path', `${path}.${i}`), `<li><a href="?${params.toString()}">${a.title}</a></li>`));
    headerEl.innerHTML = `<h1>${name}</h1>`;
    pageEl.innerHTML = `<p><ul>${maps.join('')}</ul></p>`;
  } else {
    const page = getSubPage(pages, subPath);
    if (page == null) {
      alert(path + ' not found (-2)');
      params.set('path', path.split('.').slice(0, -1).join('.'));
      location.search = params.toString();
      return;
    }
    headerEl.innerHTML = `<h1>${page.title}</h1>`;
    pageEl.innerHTML = getContent(page);
  }

  function getImageFn() {
    if (imgStart === 0) return _i => null;
    globalOffset = imgStart;
    const imgSize = uint32(globalOffset);
    console.log('imgSize', imgSize);
    const imgs = [];
    for (let i = 0; i < imgSize; i++) {
      const pos = uint32(globalOffset);
      imgs.push({ pos });
    }
    const imgEnd = uint32(globalOffset);
    const imgSlice = raw.slice(imgStart, imgStart + imgEnd);
    for (let i = 0; i < imgSize; i++) {
      imgs[i].len = imgs[i + 1] ? imgs[i + 1].pos - imgs[i].pos : imgEnd - imgs[i].pos;
      imgs[i].content = imgSlice.slice(imgs[i].pos, imgs[i].pos + imgs[i].len);
    }
    const getImage = i => {
      const type = getString(imgStart + imgs[i].pos, 4);
      if (type !== 'JPG\x00') throw new Error('not implemented');
      const blob = new Blob([imgs[i].content.slice(4)], { type: 'image/jpeg' });
      return URL.createObjectURL(blob);
    };
    console.log('images', imgs);
    globalOffset = imgEnd;
    return getImage;
  }

  function getContent(page) {
    switch (page.type) {
      case 0: {
        const maps = page.subPages.map((a, i) => {
          params.set('path', `${path}.${i}`);
          return `<li><a href="?${params.toString()}">${a.title}</a></li>`;
        });
        return `<p><ul>${maps.join('')}</ul></p>`;
      }
      case 1: {
        const content = page.content
          .replace(/@pic_(\d+)/g, (_, i) => {
            const url = getImage(i);
            return `<img src="${url}" />`;
          })
          .replace(/^( *)(.*)$/gm, (_, a, b) => `<p style="text-indent:${format === 'MSP' ? a.length / 2 : a.length}em">${b}</p>`)
          .replace(/\ue103/g, '\u00b2')
          .replace(/\ue104/g, '\u00b3')
          .replace(/\ue349/g, '\u571e')
          .replace(/\r/g, '');
        return `${content}`;
      }
      default:
        throw new Error('not implemented');
    }
  }

  function getSubPage(pages, path) {
    if (pages == null) return null;
    const [i, ...rest] = path.split('.');
    if (rest.length === 0) return pages[i];
    if (pages[i] == null) return null;
    return getSubPage(pages[i].subPages, rest.join('.'));
  }

  function readPages(pageSize) {
    const pages = [];
    for (let i = 0; i < pageSize; i++) {
      const type = uint16(globalOffset);
      const pos = uint32(globalOffset);
      const title = getString(globalOffset, 100);
      pages.push({ type, pos, title });
    }
    for (let i = 0; i < pageSize; i++) {
      pages[i].title = pages[i].title.replace(/\0/g, '');
      switch (pages[i].type) {
        case 0:
          pages[i].raw = raw.slice(pages[i].pos, pages[i + 1] ? pages[i + 1].pos : imgStart);
          console.log('1', uint32(pages[i].pos), pages[i].pos);
          const pageSize = uint32(globalOffset);
          pages[i].subPages = readPages(pageSize);
          break;
        case 1:
          pages[i].len = uint32(pages[i].pos);
          pages[i].raw = raw.slice(pages[i].pos, pages[i].pos + pages[i].len);
          pages[i].content = getString(globalOffset, pages[i].len);
          break;
        default:
          throw new Error('not implemented');
      }
    }
    return pages;
  }
}
main();
