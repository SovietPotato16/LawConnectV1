import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

interface TagSuggestionListProps {
  props: {
    items: Array<{ id: string; nombre: string; color: string }>
    command: (item: { id: string; nombre: string; color: string }) => void
  }
  editor: any
}

export const TagSuggestionList = forwardRef<any, TagSuggestionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.props.items[index]
    if (item) {
      props.props.command(item)
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.props.items.length - 1) % props.props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  return (
    <div className="bg-surface0 border border-surface2 rounded-lg shadow-lg p-1 max-h-48 overflow-y-auto">
      {props.props.items.length ? (
        props.props.items.map((item, index) => (
          <button
            key={item.id}
            className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-surface1 ${
              index === selectedIndex ? 'bg-surface1' : ''
            }`}
            onClick={() => selectItem(index)}
          >
            <span
              className="inline-block w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: item.color }}
            />
            #{item.nombre}
          </button>
        ))
      ) : (
        <div className="px-3 py-2 text-sm text-subtext0">No hay tags disponibles</div>
      )}
    </div>
  )
})

TagSuggestionList.displayName = 'TagSuggestionList'