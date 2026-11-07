import React from 'react';

export const Table = ({ columns, data, isLoading, emptyMessage = 'No records found' }) => {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200/80 p-8 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs text-slate-400 mt-2">Loading data...</span>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50/75">
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  scope="col"
                  className={`px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 ${
                    col.align === 'right' ? 'text-right' : 'text-left'
                  } ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {data && data.length > 0 ? (
              data.map((row, rowIndex) => (
                <tr key={row.id || rowIndex} className="hover:bg-slate-50/50 transition-colors">
                  {columns.map((col, colIndex) => (
                    <td
                      key={colIndex}
                      className={`whitespace-nowrap px-6 py-4 text-slate-700 ${
                        col.align === 'right' ? 'text-right' : 'text-left'
                      } ${col.className || ''}`}
                    >
                      {col.render ? col.render(row) : row[col.accessor]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <svg className="w-10 h-10 text-slate-300 stroke-current" fill="none" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-sm font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Table;

