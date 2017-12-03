import { LOWERCASE_TAGS, CLASS_OR_ID } from '../config'
import { conflict } from '../utils'
import selection from '../selection'
import { tokenizer } from './parse'
import { validEmoji } from '../emojis'

const snabbdom = require('snabbdom')
const patch = snabbdom.init([ // Init patch function with chosen modules
  require('snabbdom/modules/class').default, // makes it easy to toggle classes
  require('snabbdom/modules/props').default, // for setting properties on DOM elements
  require('snabbdom/modules/dataset').default
])
const h = require('snabbdom/h').default // helper function for creating vnodes
const toVNode = require('snabbdom/tovnode').default

class StateRender {
  constructor () {
    this.container = null
    this.vdom = null
  }

  setContainer (container) {
    this.container = container
  }

  checkConflicted (block, token, cursor) {
    const key = block.key
    const cursorKey = cursor.key
    if (key !== cursorKey) {
      return false
    } else {
      const { start, end } = token.range
      const { start: cStart, end: cEnd } = cursor.range
      return conflict([start, end], [cStart, cEnd])
    }
  }

  getClassName (outerClass, block, token, cursor) {
    return outerClass || (this.checkConflicted(block, token, cursor) ? CLASS_OR_ID['AG_GRAY'] : CLASS_OR_ID['AG_HIDE'])
  }
  /**
   * [render]: 2 steps:
   * render vdom
   * return set cursor method
   */
  render (blocks, cursor) {
    const selector = `${LOWERCASE_TAGS.div}#${CLASS_OR_ID['AG_EDITOR_ID']}.${CLASS_OR_ID['mousetrap']}`
    const renderBlock = block => {
      const blockSelector = `${block.type}#${block.key}.${CLASS_OR_ID['AG_PARAGRAPH']}`

      if (block.children.length) {
        return h(blockSelector, block.children.map(child => renderBlock(child)))
      } else {
        const children = block.text
          ? tokenizer(block.text).reduce((acc, token) => {
            const chunk = this[token.type](h, cursor, block, token)
            return Array.isArray(chunk) ? [...acc, ...chunk] : [...acc, chunk]
          }, [])
          : [ h(LOWERCASE_TAGS.br) ]

        return h(blockSelector, children)
      }
    }

    const children = blocks.map(block => {
      return renderBlock(block)
    })

    const newVdom = h(selector, children)
    const root = document.querySelector(selector) || this.container
    const oldVdom = toVNode(root)

    patch(oldVdom, newVdom)

    this.vdom = newVdom
    if (cursor && cursor.range) {
      const cursorEle = document.querySelector(`#${cursor.key}`)
      selection.importSelection(cursor.range, cursorEle)
    }
  }

  hr (h, cursor, block, token, outerClass) {
    const className = CLASS_OR_ID['AG_GRAY']
    return [
      h(`a.${className}`, {
        props: { href: '#' }
      }, token.marker)
    ]
  }

  header (h, cursor, block, token, outerClass) {
    const className = this.getClassName(outerClass, block, token, cursor)
    return [
      h(`a.${className}`, {
        props: { href: '#' }
      }, token.marker)
    ]
  }

  ['code_fense'] (h, cursor, block, token, outerClass) {
    return [
      h(`a.${CLASS_OR_ID['AG_GRAY']}`, {
        props: { href: '#' }
      }, token.marker),
      h(`a.${CLASS_OR_ID['AG_LANGUAGE']}`, {
        props: { href: '#' }
      }, token.content)
    ]
  }

  backlash (h, cursor, block, token, outerClass) {
    const className = this.getClassName(outerClass, block, token, cursor)
    return [
      h(`a.${className}`, {
        props: { href: '#' }
      }, token.marker)
    ]
  }

  ['inline_code'] (h, cursor, block, token, outerClass) {
    const className = this.getClassName(outerClass, block, token, cursor)
    return [
      h(`a.${className}`, {
        props: { href: '#' }
      }, token.marker),
      h('code', token.content),
      h(`a.${className}`, {
        props: { href: '#' }
      }, token.marker)
    ]
  }

  text (h, cursor, block, token) {
    return token.content
  }

  emoji (h, cursor, block, token, outerClass) {
    const className = this.getClassName(outerClass, block, token, cursor)
    const validation = validEmoji(token.content)
    const finalClass = validation ? className : CLASS_OR_ID['AG_WARN']
    const emojiVdom = validation
      ? h(`a.${finalClass}.${CLASS_OR_ID['AG_EMOJI_MARKED_TEXT']}`, { dataset: { emoji: validation.emoji } }, token.content)
      : h(`a.${finalClass}.${CLASS_OR_ID['AG_EMOJI_MARKED_TEXT']}`, token.content)

    return [
      h(`a.${finalClass}`, { props: { href: '#' } }, token.marker),
      emojiVdom,
      h(`a.${finalClass}`, { props: { href: '#' } }, token.marker)
    ]
  }

  em (h, cursor, block, token, outerClass) {
    const className = this.getClassName(outerClass, block, token, cursor)
    return [
      h(`a.${className}`, {
        props: { href: '#' }
      }, token.marker),
      h('em', token.children.reduce((acc, to) => {
        const chunk = this[to.type](h, cursor, block, to, className)
        return Array.isArray(chunk) ? [...acc, ...chunk] : [...acc, chunk]
      }, [])),
      h(`a.${className}`, {
        props: { href: '#' }
      }, token.marker)
    ]
  }

  strong (h, cursor, block, token, outerClass) {
    const className = this.getClassName(outerClass, block, token, cursor)
    return [
      h(`a.${className}`, {
        props: { href: '#' }
      }, token.marker),
      h('strong', token.children.reduce((acc, to) => {
        const chunk = this[to.type](h, cursor, block, to, className)
        return Array.isArray(chunk) ? [...acc, ...chunk] : [...acc, chunk]
      }, [])),
      h(`a.${className}`, {
        props: { href: '#' }
      }, token.marker)
    ]
  }
}

export default StateRender
