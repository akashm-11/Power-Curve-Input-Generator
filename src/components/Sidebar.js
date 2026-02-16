"use client";

export default function Sidebar({
  files,
  selectedFiles,
  sidebarCollapsed,
  filesCollapsed,
  onToggleSidebar,
  onToggleFiles,
  onToggleFileSelection,
  onSelectAllToggle,
  renderFileItem,
  Icon,
  Button,
}) {
  const allSelected = files.length > 0 && selectedFiles.length === files.length;

  return (
    <aside
      className={`bg-zinc-900/50 backdrop-blur-xl border-r border-zinc-800 flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${
        sidebarCollapsed ? "w-16" : "w-85"
      }`}
    >
      {/* Sidebar Header */}
      <div className="px-4 py-1 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
        {!sidebarCollapsed && (
          <h2 className="text-sm text-zinc-200 uppercase tracking-wide">
            File Manager
          </h2>
        )}
        <button
          onClick={onToggleSidebar}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-all text-zinc-400 hover:text-zinc-200"
        >
          <Icon
            path="M11 19l-7-7 7-7m8 14l-7-7 7-7"
            className={`w-5 h-5 transition-transform ${
              sidebarCollapsed ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Expanded */}
      {!sidebarCollapsed ? (
        <div
          className={`flex flex-col border-b border-zinc-800 transition-all duration-300 ${
            filesCollapsed ? "flex-shrink-0" : "flex-1 min-h-0"
          }`}
        >
          {/* Files Header */}
          <div className="px-4 py-1 border-b border-zinc-800 flex items-center justify-between bg-zinc-800/30 flex-shrink-0">
            <h3 className="text-sm text-zinc-200 uppercase tracking-wide">
              Output Files {files.length > 0 && `(${files.length})`}
            </h3>
            <button
              onClick={onToggleFiles}
              className="p-1.5 hover:bg-zinc-700 rounded-lg transition-all text-zinc-400 hover:text-zinc-200"
            >
              <Icon
                path="M19 9l-7 7-7-7"
                className={`transition-transform ${
                  filesCollapsed ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {!filesCollapsed && (
            <>
              {/* Select all */}
              {files.length > 0 && (
                <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                  <Button
                    onClick={onSelectAllToggle}
                    variant="ghost"
                    className="w-full text-xs"
                  >
                    {allSelected ? "Deselect All" : "Select All"}
                  </Button>
                </div>
              )}

              {/* Files list */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                {files.length === 0 ? (
                  <div className="text-center py-12">
                    <Icon
                      path="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                      className="w-12 h-12 mx-auto text-zinc-700 mb-3"
                    />
                    <p className="text-xs text-zinc-400 font-medium">
                      No folder selected
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Upload to get started
                    </p>
                  </div>
                ) : (
                  files.map(renderFileItem)
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        /* Collapsed */
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <Icon
              path="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              className="w-8 h-8 mx-auto text-zinc-600 mb-2"
            />
            <p className="text-xs text-zinc-500 transform rotate-90 whitespace-nowrap mt-4">
              {files.length} files
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
