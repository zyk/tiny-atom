/**
 * Minimal state management.
 *
 * const evolve = (get, split, action) => split({ count: get().count + 1 })
 * const render = (atom) => console.log(atom.get())
 * const atom = createAtom({ count: 1 }, evolve, render)
 *
 * atom.observe(atom => console.log(atom.get()))
 *
 * atom.get() // { count: 1 }
 * atom.split('increment') // action
 * atom.split('increment', { by: 2 }) // action with payload
 * atom.split({ count: 0 }) // update state directly
 */
module.exports = function createAtom (initialState, evolve, render, options) {
  if (typeof render !== 'function') {
    options = render
    render = null
  }
  options = options || {}
  let state = initialState || {}
  let actions = {}
  let actionSeq = 0
  const listeners = []
  const merge = options.merge || defaultMerge
  const debug = options.debug
  if (render) observe(render)
  const atom = { get, split: createSplit(), observe, fuse }
  evolve = evolve || function () {}
  if (typeof evolve !== 'function') {
    actions = evolve
    evolve = defaultEvolve
  }
  return atom

  function defaultMerge (state, update) {
    return Object.assign({}, state, update)
  }

  function defaultEvolve (get, split, action, actions) {
    actions[action.type](get, split, action.payload)
  }

  function get () {
    return state
  }

  function observe (f) {
    listeners.push(f)
    return function unobserve () {
      if (listeners.indexOf(f) >= 0) {
        listeners.splice(listeners.indexOf(f), 1)
      }
    }
  }

  function fuse (moreState, moreActions) {
    if (moreActions) Object.assign(actions, moreActions)
    if (moreState) atom.split(moreState)
  }

  function createSplit (sourceActions) {
    sourceActions = sourceActions || []
    return function split (type, payload) {
      let action, prevState
      if (typeof type === 'string') {
        action = { seq: ++actionSeq, type: type }
        if (typeof payload !== 'undefined') action.payload = payload
        if (debug) report('action', action, sourceActions)
        const split = debug ? createSplit(sourceActions.concat([action])) : atom.split
        evolve(get, split, action, actions)
      } else {
        action = { payload: type }
        prevState = state
        state = merge(state, action.payload)
        if (debug) report('update', action, sourceActions, prevState)
        listeners.forEach(f => f(atom))
      }
    }
  }

  function report (type, action, sourceActions, prevState) {
    const info = { type: type, action: action, sourceActions: sourceActions, atom: atom }
    if (prevState) info.prevState = prevState
    debug(info)
  }
}
