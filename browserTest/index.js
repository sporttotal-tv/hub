import React, { useState } from 'react'
import { createClient, useHub, useRpc, Provider, connect } from '../client'
import ReactDOM from 'react-dom'

const client = createClient({})

client.set('device.bla', 1)

setInterval(() => {
  client.set('device.bla', client.get('device.bla') + 1)
}, 18)

const Power = connect(
  ({ data }) => {
    return data
  },
  'device.bla'
)

// cannot test useEffect so hard to rest useRpc
const Thing2 = () => {
  const hub = useHub()
  const [bla, changeIt] = useState(0)
  const blax = useRpc('device.bla')
  const blurf = useRpc('device.blurf', {
    id: ~~(bla / 5)
  })
  return (
    <div
      style={{
        cursor: 'pointer'
      }}
      onClick={() => {
        const newbla = bla + 1
        const props = {
          endpoint: 'device',
          method: 'blurf',
          args: { id: ~~(newbla / 5) }
        }
        hub.set(props, 'ballz times ' + newbla)
        changeIt(newbla)
      }}
    >
      THIS = "{bla}" blurf="{blurf}" blax={blax}
    </div>
  )
}

const App = () => {
  return (
    <Provider hub={client}>
      <Thing2 />
      <Power />
    </Provider>
  )
}

const d = document.createElement('div')

ReactDOM.render(<App />, d)

document.body.appendChild(d)
