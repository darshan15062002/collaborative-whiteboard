import { useState } from "react";

const ShareDialog = ({ setIsCollaborating, roomId, encryptionKey, handleStartSharing }) => {
    const [activeSessionDialog, setActiveSessionDialog] = useState(false);
    if (roomId && activeSessionDialog) {
        return <ActiveSessionDialog setIsCollaborating={setIsCollaborating} encryptionKey={encryptionKey} roomId={roomId} handleStopSharing={() => setIsCollaborating(false)} />
    } else {
        return (

            <div onClick={() => setIsCollaborating(false)} className="  fixed inset-0 flex items-center justify-center  bg-opacity-30 z-50">
                <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-lg p-6 w-[430px] max-w-full">
                    {/* Live collaboration */}
                    <div className="text-center flex flex-col items-center mb-6">
                        <h2 className="text-lg font-semibold text-purple-600 mb-2">
                            Live collaboration
                        </h2>
                        <p className="text-gray-600 mb-1">
                            Invite people to collaborate on your drawing.
                        </p>
                        <p className="text-sm text-gray-500 mb-4">
                            Don't worry, the session is end-to-end encrypted, and fully private. Not even our server can see what you draw.
                        </p>
                        <button onClick={() => {
                            setActiveSessionDialog(true);
                            handleStartSharing()
                        }} className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition">
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                viewBox="0 0 24 24"
                            >
                                <path stroke="none" d="M0 0h24v24H0z" />
                                <path d="M7 4v16l13 -8z" />
                            </svg>
                            Start session
                        </button>
                    </div>

                    {/* Separator */}
                    <div className="my-6 flex items-center justify-center">
                        <hr className="flex-grow border-gray-300" />
                        <span className="mx-3 text-sm text-gray-400">Or</span>
                        <hr className="flex-grow border-gray-300" />
                    </div>

                    {/* Shareable link */}
                    <div className="text-center flex flex-col items-center mb-6">
                        <h2 className="text-lg font-semibold text-purple-600 mb-2">
                            Shareable link
                        </h2>
                        <p className="text-gray-600 mb-4">Export as a read-only link.</p>
                        <button className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md transition">
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.25"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                viewBox="0 0 20 20"
                            >
                                <path d="M8.333 11.667a2.917 2.917 0 0 0 4.167 0l3.333-3.334a2.946 2.946 0 1 0-4.166-4.166l-.417.416" />
                                <path d="M11.667 8.333a2.917 2.917 0 0 0-4.167 0l-3.333 3.334a2.946 2.946 0 0 0 4.166 4.166l.417-.416" />
                            </svg>
                            Export to Link
                        </button>
                    </div>
                </div>
            </div>
        );
    }
};

export default ShareDialog;


const ActiveSessionDialog = ({ setIsCollaborating, roomId, encryptionKey, handleStopSharing }) => {
    return (
        <div onClick={() => setIsCollaborating(false)} className="fixed inset-0 flex items-center justify-center  bg-opacity-30 z-50">
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-lg p-6 w-[430px] max-w-full">
                <h3 className="text-lg font-semibold text-purple-600 mb-4">Live collaboration</h3>

                {/* Your name */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your name</label>
                    <input
                        type="text"
                        placeholder="Your name"
                        defaultValue="Bright Otter"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>

                {/* Share Link Row */}
                <div className="mb-4 flex flex-col gap-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Link</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            readOnly
                            value={`${window.location.origin}/#room=${roomId},${encryptionKey}`}
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-600 text-sm truncate"
                        />
                        <button
                            type="button"
                            aria-label="Copy link"
                            onClick={() => navigator.clipboard.writeText(`${window.location.origin}/#room=${roomId},${encryptionKey}`)}
                            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-md"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2"
                                strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                                <path d="M8 8m0 2a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2z" />
                                <path d="M16 8v-2a2 2 0 0 0 -2 -2h-8a2 2 0 0 0 -2 2v8a2 2 0 0 0 2 2h2" />
                            </svg>
                            Copy link
                        </button>
                    </div>
                </div>

                {/* Info */}
                <div className="text-sm text-gray-600 mb-6 space-y-2">
                    <p>🔒 This session is end-to-end encrypted and private.</p>
                    <p>Stopping the session disconnects only you — others can continue working.</p>
                </div>

                {/* Stop Session */}
                <div className="text-center">
                    <button
                        onClick={handleStopSharing}
                        type="button"
                        className="flex items-center justify-center gap-2 border border-red-500 text-red-600 hover:bg-red-50 px-4 py-2 rounded-md"
                    >
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M17 4h-10a3 3 0 0 0 -3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3 -3v-10a3 3 0 0 0 -3 -3z" />
                        </svg>
                        Stop session
                    </button>
                </div>
            </div>
        </div>
    );
};


