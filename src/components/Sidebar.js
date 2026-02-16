"use client";

export default function Sidebar({
  files,
  selectedFiles,
  sidebarCollapsed,
  filesCollapsed,
  onToggleSidebar,
  onToggleFiles,
  onSelectAllToggle,
  renderFileItem,
  Icon,
  Button,
}) {
  if (sidebarCollapsed) {
    return (
      <div className="w-16 bg-zinc-900/50 border-r border-zinc-800 flex flex-col items-center py-4">
        <button
          onClick={onToggleSidebar}
          className="p-3 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Expand Sidebar"
        >
          <Icon path="M9 5l7 7-7 7" className="w-5 h-5 text-zinc-400" />
        </button>
      </div>
    );
  }

  const allSelected = selectedFiles.length === files.length && files.length > 0;

  return (
    <aside className="w-80 bg-zinc-900/50 border-r border-zinc-800 flex flex-col overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/70 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Icon path="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          <h2 className="text-sm font-semibold text-zinc-100 uppercase tracking-wide">
            Files
          </h2>
          {files.length > 0 && (
            <span className="text-xs bg-zinc-700 text-zinc-300 px-2 py-0.5 rounded-full">
              {files.length}
            </span>
          )}
        </div>

        <button
          onClick={onToggleSidebar}
          className="p-1.5 hover:bg-zinc-800 rounded-lg transition-colors"
          title="Collapse Sidebar"
        >
          <Icon path="M15 19l-7-7 7-7" className="w-4 h-4 text-zinc-400" />
        </button>
      </div>

      {/* Files Section */}
      {files.length > 0 && (
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={onToggleFiles}
                className="flex items-center gap-2 text-sm font-medium text-zinc-200 hover:text-zinc-100"
              >
                <Icon
                  path={filesCollapsed ? "M9 5l7 7-7 7" : "M19 9l-7 7-7-7"}
                  className="w-4 h-4"
                />
                Selected Files ({selectedFiles.length}/{files.length})
              </button>
            </div>

            {!filesCollapsed && (
              <Button
                onClick={onSelectAllToggle}
                variant="tertiary"
                className="w-full text-xs py-2"
              >
                {allSelected ? (
                  <>
                    <Icon path="M6 18L18 6M6 6l12 12" className="w-3 h-3" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Icon
                      path="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      className="w-3 h-3"
                    />
                    Select All
                  </>
                )}
              </Button>
            )}
          </div>

          {!filesCollapsed && (
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="space-y-2">
                {files.map((file, idx) => renderFileItem(file, idx))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-zinc-800/50 flex items-center justify-center">
              <Icon
                path="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                className="w-8 h-8 text-zinc-600"
              />
            </div>
            <p className="text-sm text-zinc-400">No files loaded</p>
            <p className="text-xs text-zinc-500 mt-1">
              Upload a folder to get started
            </p>
          </div>
        </div>
      )}

      {/* Info Footer */}
      {files.length > 0 && (
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/70 flex-shrink-0">
          <div className="text-xs text-zinc-400 space-y-1">
            <div className="flex justify-between">
              <span>Total Files:</span>
              <span className="text-zinc-300 font-medium">{files.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Selected:</span>
              <span className="text-emerald-400 font-medium">
                {selectedFiles.length}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
