import { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { useDropzone } from "react-dropzone";
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";

export default function ImageConverter() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"jpeg" | "png" | "webp" | "avif">(
    "jpeg"
  );
  const [quality, setQuality] = useState(0.8);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [convertedBlob, setConvertedBlob] = useState<Blob | null>(null);
  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const clipRef = useRef<HTMLDivElement>(null);
  const dividerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const formats = ["jpeg", "png", "webp", "avif"];

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles.length > 0) {
        handleNewFile(acceptedFiles[0]);
      }
    },
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "image/avif": [],
    },
  });

  const handleNewFile = (file: File) => {
    const url = URL.createObjectURL(file);
    setFile(file);
    setOriginalUrl(url);
    autoConvert(file);
  };

  const autoConvert = (file: File) => {
    const ext = file.type.split("/")[1];
    if (ext === "jpeg" || ext === "jpg") {
      setFormat("png");
    } else {
      setFormat("jpeg");
    }
    convertOnly(file);
  };

  const handleFormatChange = (value: "jpeg" | "png" | "webp" | "avif") => {
    setFormat(value);
    if (file) {
      convertOnly(file);
    }
  };

  const handleQualityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuality = parseFloat(e.target.value);
    setQuality(newQuality);
    if (file) {
      convertOnly(file);
    }
  };

  const convertOnly = (inputFile: File) => {
    const img = new Image();
    img.src = URL.createObjectURL(inputFile);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            if (convertedUrl) URL.revokeObjectURL(convertedUrl);
            const newUrl = URL.createObjectURL(blob);
            setConvertedUrl(newUrl);
            setConvertedBlob(blob);
          }
        },
        `image/${format}`,
        quality
      );
    };
  };

  const moveSlider = useCallback((clientX: number) => {
    if (!containerRef.current || !clipRef.current || !dividerRef.current)
      return;

    const rect = containerRef.current.getBoundingClientRect();
    let pos = ((clientX - rect.left) / rect.width) * 100;
    pos = Math.min(Math.max(pos, 0), 100);

    clipRef.current.style.clipPath = `inset(0 ${100 - pos}% 0 0)`;
    dividerRef.current.style.left = `${pos}%`;
  }, []);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      moveSlider(e.clientX);
    },
    [moveSlider]
  );

  const onTouchMove = useCallback(
    (e: TouchEvent) => {
      moveSlider(e.touches[0].clientX);
    },
    [moveSlider]
  );

  const startDrag = (e: React.MouseEvent | React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (handleRef.current && handleRef.current.contains(target)) {
      isDragging.current = true;
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("touchmove", onTouchMove);
    }
  };

  const stopDrag = () => {
    if (isDragging.current) {
      isDragging.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
    }
  };

  const handlePaste = (event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (items) {
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const pastedFile = item.getAsFile();
          if (pastedFile) {
            handleNewFile(pastedFile);
          }
        }
      }
    }
  };

  const handleReset = () => {
    setFile(null);
    setOriginalUrl(null);
    setConvertedUrl(null);
    setConvertedBlob(null);
    setZoomLevel(1);
  };

  const handleDownload = () => {
    if (!convertedBlob) return;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(convertedBlob);
    link.download = `converted.${format}`;
    link.click();
  };

  const zoomIn = () => setZoomLevel((z) => Math.min(z + 0.1, 3));
  const zoomOut = () => setZoomLevel((z) => Math.max(z - 0.1, 0.5));
  const zoomFit = () => setZoomLevel(1);

  useEffect(() => {
    window.addEventListener("mouseup", stopDrag);
    window.addEventListener("touchend", stopDrag);
    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("mouseup", stopDrag);
      window.removeEventListener("touchend", stopDrag);
      window.removeEventListener("paste", handlePaste);
    };
  }, [moveSlider]);

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-gray-100">
      <div className="flex flex-col w-full h-full bg-white relative overflow-hidden">
        {!originalUrl ? (
          <div className="flex flex-grow items-center justify-center">
            <div
              {...getRootProps()}
              className="flex items-center justify-center w-11/12 h-3/4 max-w-lg border-4 border-dashed border-gray-300 rounded-lg cursor-pointer"
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p className="text-blue-500 font-semibold">
                  Drop the image here...
                </p>
              ) : (
                <p className="text-gray-500 font-semibold text-center">
                  Drag & Drop an image here, click to select, or paste (Ctrl+V)
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-grow flex items-center justify-center relative z-10">
            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="absolute top-4 left-4 bg-gray-800/80 backdrop-blur-md rounded-full p-2 shadow-md hover:bg-red-500 transition-colors z-20"
            >
              <span className="text-white text-xl font-bold">×</span>
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="absolute top-4 right-4 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded shadow-md z-20"
            >
              Download
            </button>

            {/* Image View */}
            <div
              className="relative w-full h-full select-none"
              ref={containerRef}
            >
              <div className="relative w-full h-full">
                {/* Original Image */}
                <img
                  src={originalUrl}
                  alt="Original"
                  draggable={false}
                  style={{ transform: `scale(${zoomLevel})` }}
                  className="absolute top-0 left-0 w-full h-full origin-center transition-transform duration-200 object-contain select-none"
                />

                {/* Converted Image */}
                <div
                  ref={clipRef}
                  className="absolute top-0 left-0 w-full h-full overflow-hidden"
                  style={{
                    clipPath: `inset(0 50% 0 0)`,
                  }}
                >
                  <img
                    src={convertedUrl || ""}
                    alt="Converted"
                    draggable={false}
                    style={{ transform: `scale(${zoomLevel})` }}
                    className="w-full h-full origin-center transition-transform duration-200 object-contain select-none"
                  />
                </div>

                {/* Divider Line + Handle */}
                <div
                  ref={dividerRef}
                  className="absolute top-0 h-full border-l-2 border-blue-500"
                  style={{
                    left: `50%`,
                  }}
                >
                  <div
                    ref={handleRef}
                    onMouseDown={startDrag}
                    onTouchStart={startDrag}
                    className="bg-blue-500 w-6 h-6 rounded-full absolute top-1/2 transform -translate-x-1/2 -translate-y-1/2 cursor-grab"
                  ></div>
                </div>

                {/* Floating Controls */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800/80 backdrop-blur-md rounded-md px-6 py-3 flex flex-col gap-3 items-center shadow-lg w-[280px] text-white">
                  {/* Format select (Listbox) */}
                  <div className="w-full">
                    <Listbox value={format} onChange={handleFormatChange}>
                      <div className="relative mt-1">
                        <ListboxButton className="relative w-full cursor-pointer rounded-lg bg-gray-800/80 py-2 pl-3 pr-10 text-left text-white shadow-md focus:outline-none">
                          <span className="block uppercase">{format}</span>
                          {/* Listbox icon */}
                          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                            <svg
                              className="h-5 w-5 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 20 20"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M7 7l3-3 3 3m0 6l-3 3-3-3"
                              />
                            </svg>
                          </span>
                        </ListboxButton>
                        <ListboxOptions className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-gray-800 py-1 text-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                          {formats.map((item) => (
                            <ListboxOption
                              key={item}
                              value={item}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                                  active
                                    ? "bg-blue-600 text-white"
                                    : "text-white"
                                }`
                              }
                            >
                              <span className="block uppercase">{item}</span>
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </div>
                    </Listbox>
                  </div>

                  {/* Quality range */}
                  <div className="flex items-center gap-2 w-full justify-between">
                    <label>Quality:</label>
                    <span>{Math.round(quality * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={quality}
                    onChange={handleQualityChange}
                    className="w-full"
                  />

                  {/* Zoom controls */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={zoomOut}
                      className="bg-gray-300 hover:bg-gray-400 text-black font-bold px-3 py-1 rounded"
                    >
                      −
                    </button>
                    <button
                      onClick={zoomFit}
                      className="bg-gray-300 hover:bg-gray-400 text-black font-bold px-3 py-1 rounded"
                    >
                      Fit
                    </button>
                    <button
                      onClick={zoomIn}
                      className="bg-gray-300 hover:bg-gray-400 text-black font-bold px-3 py-1 rounded"
                    >
                      +
                    </button>
                  </div>

                  {/* Zoom % */}
                  <div className="text-sm mt-2">
                    Zoom: {Math.round(zoomLevel * 100)}%
                  </div>
                </div>

                {/* Info Labels */}
                <div className="absolute bottom-2 left-4 bg-gray-800/80 text-white px-3 py-1 rounded text-xs">
                  Original: {file?.type.split("/")[1].toUpperCase()} —{" "}
                  {file ? formatFileSize(file.size) : "0B"}
                </div>
                <div className="absolute bottom-2 right-4 bg-gray-800/80 text-white px-3 py-1 rounded text-xs">
                  Converted: {format.toUpperCase()} —{" "}
                  {convertedBlob ? formatFileSize(convertedBlob.size) : "0B"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
