"use client";

import { useRef, useState } from "react";
import styles from "./FileUpload.module.css";

export default function FileUpload({ onFileSelect, disabled }) {
    const [dragActive, setDragActive] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const inputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file) => {
        const ext = file.name.split(".").pop().toLowerCase();
        if (!["txt", "docx"].includes(ext)) {
            alert("Please upload a .txt or .docx file");
            return;
        }
        setSelectedFile(file);
        onFileSelect(file);
    };

    const removeFile = () => {
        setSelectedFile(null);
        onFileSelect(null);
        if (inputRef.current) {
            inputRef.current.value = "";
        }
    };

    return (
        <div
            className={`${styles.dropzone} ${dragActive ? styles.active : ""} ${disabled ? styles.disabled : ""
                }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => !disabled && inputRef.current?.click()}
        >
            <input
                ref={inputRef}
                type="file"
                accept=".txt,.docx"
                onChange={handleChange}
                className={styles.input}
                disabled={disabled}
            />
            {selectedFile ? (
                <div className={styles.fileInfo}>
                    <div className={styles.fileIcon}>📄</div>
                    <div className={styles.fileDetails}>
                        <span className={styles.fileName}>{selectedFile.name}</span>
                        <span className={styles.fileSize}>
                            {(selectedFile.size / 1024).toFixed(1)} KB
                        </span>
                    </div>
                    <button
                        className={styles.removeBtn}
                        onClick={(e) => {
                            e.stopPropagation();
                            removeFile();
                        }}
                        disabled={disabled}
                    >
                        ✕
                    </button>
                </div>
            ) : (
                <div className={styles.placeholder}>
                    <div className={styles.uploadIcon}>
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                    </div>
                    <p className={styles.dropText}>
                        Drag & drop your content document here
                    </p>
                    <p className={styles.dropSubtext}>or click to browse</p>
                    <span className={styles.formats}>Supports .txt and .docx</span>
                </div>
            )}
        </div>
    );
}
