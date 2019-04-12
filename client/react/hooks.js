const React = require('react')
const { useContext, useEffect, useState, useRef } = React
const HubContext = React.createContext({})
const { config } = require('../format')
const { internalRpc } = require('../rpc')
const { close } = require('../close')
const { getLocal } = require('../getLocal')
const { getStore } = require('../getStore')
const { hash, argHasher, djb2 } = require('../hash')
const { Provider: ProviderLegacy } = require('./')

exports.Provider = ({ hub, children }) => {
  return React.createElement(
    HubContext.Provider,
    {
      value: hub
    },
    React.createElement(ProviderLegacy, { hub }, children)
  )
}

exports.HubContext = HubContext

exports.useHub = () => {
  return useContext(HubContext)
}

const convertToObject = props => {
  const split = props.split('.')
  const method = split[split.length - 1]
  const endpoint = split.slice(0, -1).join('.')
  return { method, endpoint }
}
const hookFormat = (hub, props, args, hashed) => {
  if (typeof props === 'string') {
    props = convertToObject(props)
  }
  if (args !== void 0) {
    props.args = args
  }
  props.hash = hashed || hash(props)
  config(hub, props)
  props.store = getStore(hub, props)
  return props
}

const updateRange = (hub, subscription, id, parsed, previous) => {
  const range = subscription.range
  if (
    previous.id === id &&
    (!previous.range ||
      previous.range[0] !== range[0] ||
      previous.range[1] !== range[1])
  ) {
    parsed = previous.parsed
    if (parsed) {
      parsed.range = range
      previous.range = range
      internalRpc(hub, parsed)
      return true
    }
  }
}

exports.useRpc = (subscription, args, defaultValue) => {
  const hub = useContext(HubContext)
  let [result, update] = useState({})
  const ref = useRef({ parsed: false, range: false, id: false })
  const previous = ref.current
  let parsed, id, hashed, range, changedRange
  if (subscription) {
    const isString = typeof subscription === 'string'
    if (!isString && args && !defaultValue) {
      defaultValue = args
      args = void 0
    }
    if (isString && args === void 0) {
      id = subscription
    } else if (!isString && subscription.args === void 0 && args === void 0) {
      id = subscription.endpoint + '.' + subscription.method
      if (subscription.range) {
        changedRange = updateRange(hub, subscription, id, parsed, previous)
      }
    } else {
      if (args) {
        if (isString) {
          const split = subscription.split('.')
          hashed = argHasher(args, djb2(split[0], djb2(split[1]))) >>> 0
        } else {
          hashed =
            argHasher(
              args,
              djb2(subscription.endpoint, djb2(subscription.method))
            ) >>> 0
        }
      } else {
        hashed = hash(subscription)
        if (subscription.range) {
          changedRange = updateRange(hub, subscription, id, parsed, previous)
        }
      }
      id = hashed
    }
    if (
      changedRange ||
      result.v === void 0 ||
      (previous.id && previous.id !== id)
    ) {
      if (!parsed) parsed = hookFormat(hub, subscription, args, hashed)
      result = { v: getLocal(hub, parsed) }
    }
    previous.id = id
  } else {
    result = void 0
    previous.id = subscription
  }
  useEffect(
    () => {
      if (subscription) {
        if (!parsed) parsed = hookFormat(hub, subscription, args, hashed)
        previous.parsed = parsed
        parsed.isSubscriber = true
        parsed.id = id
        parsed.fromHook = true
        parsed.onChange = update
        if (!hub.isNode) {
          internalRpc(hub, parsed)
          if (range) {
            previous.range = range
          }
        }
        return () => {
          close(hub, previous.parsed)
        }
      }
    },
    [id]
  )
  return result.v === void 0 ? defaultValue : result.v
}