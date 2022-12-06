/* global bootstrap */

let tooltipTriggerList = []
let dynamicTooltipList

function setDynamicTooltipList(value) {
  dynamicTooltipList = value
}
dynamicTooltipList = []

resetTooltipTriggerList() // init

/**
 *  tooltipList usage doc:
 *  tooltipList is expected to have a list of items that will be put on to
 *  and HTML unordered list. The tooltip element is required to have the
 *  following attribute:
 *  data-tooltip-content -> list of items seperated with ;
 *
 */

// Presumably used in other files, like consultancy.js.
// eslint-disable-next-line no-unused-vars
const tooltipListWOL = styles => {
  generateTooltipWithOrderedList(tooltipTriggerList, styles)
}

const tooltipList = (content, styles) => {
  generateTooltipWithStyles(tooltipTriggerList, content, styles)
}

function generateTooltipWithOrderedList(list = tooltipTriggerList, styles) {
  return generateTooltipBase(list, function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl, {
      html: true,
      title: () => {
        let content = '<ul>'

        content += tooltipTriggerEl
          .getAttribute('data-tooltip-content')
          .split(',')
          .reduce((acc, value) => {
            if (value) {
              return `
          ${acc}
          <li>
            ${value}
          </li>          
          `
            } else {
              return acc
            }
          }, '')

        content += '</ul>'

        return content
      },
      customClass: styles
    })
  })
}

function generateTooltipWithStyles(
  list = tooltipTriggerList,
  content = el => {
    el.getAttribute('data-tooltip-content')
  },
  styles = 'tooltip-list-default-class'
) {
  let nonEmptyContent
  if (!content) {
    nonEmptyContent = el => {
      el.getAttribute('data-tooltip-content')
    }
  } else {
    nonEmptyContent = content
  }

  return generateTooltipBase(list, function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl, {
      html: true,
      title: nonEmptyContent,
      customClass: styles
    })
  })
}

function generateTooltipBase(list, fn) {
  return list.map(fn)
}

function resetTooltipTriggerList() {
  tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  )
}

function reinitalizeDefaultTooltipSet() {
  resetTooltipTriggerList()
  tooltipList()
}

function createTooltip(element, content, styles) {
  return new bootstrap.Tooltip(element, {
    html: true,
    title: content,
    customClass: styles
  })
}
