'use client';

import { useState } from 'react';
import { Upload, Modal, message } from 'antd';
import { PlusOutlined, LoadingOutlined } from '@ant-design/icons';
import Image from 'next/image';

const getBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => reject(error);
  });

export default function ImageUpload({
  value = [],
  onChange,
  maxCount = 5,
  multiple = true,
  listType = 'picture-card',
  accept = 'image/*',
  maxSize = 5, // MB
}) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [loading, setLoading] = useState(false);

  // Convert value to fileList format
  const fileList = Array.isArray(value)
    ? value.map((item, index) => ({
        uid: item.uid || `-${index}`,
        name: item.name || `image-${index}`,
        status: 'done',
        url: item.url || item,
        thumbUrl: item.thumbUrl || item.url || item,
      }))
    : [];

  const handleCancel = () => setPreviewOpen(false);

  const handlePreview = async (file) => {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj);
    }
    setPreviewImage(file.url || file.preview);
    setPreviewOpen(true);
    setPreviewTitle(file.name || file.url?.substring(file.url.lastIndexOf('/') + 1));
  };

  const handleChange = ({ fileList: newFileList }) => {
    // Convert fileList to value format
    const newValue = newFileList.map(file => ({
      uid: file.uid,
      name: file.name,
      url: file.url || file.response?.url,
      thumbUrl: file.thumbUrl,
      status: file.status,
    }));
    onChange?.(newValue);
  };

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }

    const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
    if (!isLtMaxSize) {
      message.error(`Image must be smaller than ${maxSize}MB!`);
      return false;
    }

    return true;
  };

  const customRequest = async ({ file, onSuccess, onError, onProgress }) => {
    setLoading(true);

    // Simulate upload - in production, this would upload to your server
    const formData = new FormData();
    formData.append('file', file);

    try {
      // For demo, we'll use a local URL
      // In production, replace with actual upload to backend
      const base64 = await getBase64(file);

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate successful upload
      onSuccess({
        url: base64, // In production, this would be the server URL
        name: file.name,
      });

      setLoading(false);
    } catch (error) {
      onError(error);
      setLoading(false);
      message.error('Upload failed');
    }
  };

  const uploadButton = (
    <div>
      {loading ? <LoadingOutlined /> : <PlusOutlined />}
      <div className="mt-2">Upload</div>
    </div>
  );

  return (
    <>
      <Upload
        listType={listType}
        fileList={fileList}
        onPreview={handlePreview}
        onChange={handleChange}
        beforeUpload={beforeUpload}
        customRequest={customRequest}
        multiple={multiple}
        accept={accept}
        maxCount={maxCount}
      >
        {fileList.length >= maxCount ? null : uploadButton}
      </Upload>

      <Modal
        open={previewOpen}
        title={previewTitle}
        footer={null}
        onCancel={handleCancel}
      >
        <img
          alt="preview"
          style={{ width: '100%' }}
          src={previewImage}
        />
      </Modal>
    </>
  );
}

// Single image upload variant
export function SingleImageUpload({
  value,
  onChange,
  maxSize = 5,
  className = '',
}) {
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const beforeUpload = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('You can only upload image files!');
      return false;
    }

    const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
    if (!isLtMaxSize) {
      message.error(`Image must be smaller than ${maxSize}MB!`);
      return false;
    }

    return true;
  };

  const customRequest = async ({ file, onSuccess, onError }) => {
    setLoading(true);

    try {
      const base64 = await getBase64(file);
      await new Promise(resolve => setTimeout(resolve, 500));

      onChange?.(base64);
      onSuccess({ url: base64 });
      setLoading(false);
    } catch (error) {
      onError(error);
      setLoading(false);
      message.error('Upload failed');
    }
  };

  return (
    <div className={className}>
      <Upload
        name="image"
        listType="picture-card"
        showUploadList={false}
        beforeUpload={beforeUpload}
        customRequest={customRequest}
      >
        {value ? (
          <div className="relative w-full h-full">
            <img
              src={value}
              alt="uploaded"
              className="w-full h-full object-cover rounded-lg cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewOpen(true);
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
              <span className="text-white">Change</span>
            </div>
          </div>
        ) : (
          <div>
            {loading ? <LoadingOutlined /> : <PlusOutlined />}
            <div className="mt-2">Upload</div>
          </div>
        )}
      </Upload>

      <Modal
        open={previewOpen}
        footer={null}
        onCancel={() => setPreviewOpen(false)}
      >
        <img alt="preview" style={{ width: '100%' }} src={value} />
      </Modal>
    </div>
  );
}

// Drag and drop upload
export function DragDropUpload({
  value = [],
  onChange,
  maxCount = 10,
  maxSize = 5,
}) {
  const { Dragger } = Upload;
  const [loading, setLoading] = useState(false);

  const fileList = Array.isArray(value)
    ? value.map((item, index) => ({
        uid: item.uid || `-${index}`,
        name: item.name || `image-${index}`,
        status: 'done',
        url: item.url || item,
      }))
    : [];

  const props = {
    name: 'file',
    multiple: true,
    fileList,
    maxCount,
    accept: 'image/*',
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('You can only upload image files!');
        return false;
      }
      const isLtMaxSize = file.size / 1024 / 1024 < maxSize;
      if (!isLtMaxSize) {
        message.error(`Image must be smaller than ${maxSize}MB!`);
        return false;
      }
      return true;
    },
    customRequest: async ({ file, onSuccess }) => {
      const base64 = await getBase64(file);
      await new Promise(resolve => setTimeout(resolve, 500));
      onSuccess({ url: base64 });
    },
    onChange: ({ fileList: newFileList }) => {
      const newValue = newFileList.map(file => ({
        uid: file.uid,
        name: file.name,
        url: file.url || file.response?.url,
        status: file.status,
      }));
      onChange?.(newValue);
    },
  };

  return (
    <Dragger {...props}>
      <p className="ant-upload-drag-icon">
        <PlusOutlined style={{ fontSize: 32, color: '#999' }} />
      </p>
      <p className="ant-upload-text">Click or drag images to upload</p>
      <p className="ant-upload-hint">
        Support for single or bulk upload. Max {maxCount} images, {maxSize}MB each.
      </p>
    </Dragger>
  );
}
