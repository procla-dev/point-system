import { useState, type ReactNode } from 'react'

type Column<T> = {
  key: string
  header: string
  width?: string
  render: (row: T) => ReactNode
}

type TableProps<T> = {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  emptyMessage?: string
  pageSize?: number
  onPageChange?: (page: number) => void
}

export default function Table<T>({ columns, rows, rowKey, emptyMessage, pageSize, onPageChange }: TableProps<T>) {
  const [page, setPage] = useState(1)

  function changePage(next: number) {
    setPage(next)
    onPageChange?.(next)
  }

  if (rows.length === 0) {
    return emptyMessage ? <p className="mt-4 text-gray-500">{emptyMessage}</p> : null
  }

  const totalPages = pageSize ? Math.ceil(rows.length / pageSize) : 1
  // 削除などで件数が減った場合も最終ページに収める
  const currentPage = Math.min(page, totalPages)
  const visibleRows = pageSize ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize) : rows

  return (
    <>
      <table className="mt-4 w-full table-fixed border-collapse text-left">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} style={{ width: column.width }} className="border-b-2 border-gray-400 px-2 py-1">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={rowKey(row)}>
              {columns.map((column) => (
                <td key={column.key} className="border-b border-gray-300 px-2 py-1">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => changePage(currentPage - 1)}
            disabled={currentPage === 1}
            aria-label="前のページ"
            className="p-0! disabled:opacity-30 disabled:cursor-default"
          >
            ‹
          </button>
          <span>
            {currentPage} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => changePage(currentPage + 1)}
            disabled={currentPage === totalPages}
            aria-label="次のページ"
            className="p-0! disabled:opacity-30 disabled:cursor-default"
          >
            ›
          </button>
        </div>
      )}
    </>
  )
}
