import { adaptersSR } from '@cornerstonejs/adapters';
import { metaData, utilities } from '@cornerstonejs/core';
import dcmjs from 'dcmjs';

const { MeasurementReport } = adaptersSR.Cornerstone3D;

function getFilteredCornerstoneToolState(measurementData, additionalFindingTypes) {
  return measurementData;
}

function _generateReport(measurementData, additionalFindingTypes, options = {}) {
  const filteredToolState = getFilteredCornerstoneToolState(
    measurementData,
    additionalFindingTypes
  );

  const report = MeasurementReport.generateReport(
    filteredToolState,
    metaData,
    utilities.worldToImageCoords,
    options
  );

  const { dataset } = report;

  if (typeof dataset.SpecificCharacterSet === 'undefined') {
    dataset.SpecificCharacterSet = 'ISO_IR 192';
  }

  dataset.InstanceNumber = options.InstanceNumber ?? 1;

  return dataset;
}

export default function uploadSRReport(measurementData, additionalFindingTypes = [], options = {}) {
  // Get eventidentifier from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const eventIdentifier = urlParams.get('eventidentifier');

  // Access environment variable safely with multiple fallbacks
  let FILE_ENDPOINT = 'http://localhost:55302/FileHandler.ashx';
  // const win = typeof window !== 'undefined' ? window : {};

  // // Try process.env first (available during build)
  // if (typeof process !== 'undefined' && process.env && process.env.FILE_ENDPOINT) {
  //   FILE_ENDPOINT = process.env.FILE_ENDPOINT;
  //   console.log('Found FILE_ENDPOINT in process.env:', FILE_ENDPOINT);
  // } else if (win.config && win.config.FILE_ENDPOINT) {
  //   FILE_ENDPOINT = win.config.FILE_ENDPOINT;
  //   console.log('Found FILE_ENDPOINT in window.config:', FILE_ENDPOINT);
  // } else if (win.ENV && win.ENV.FILE_ENDPOINT) {
  //   FILE_ENDPOINT = win.ENV.FILE_ENDPOINT;
  //   console.log('Found FILE_ENDPOINT in window.ENV:', FILE_ENDPOINT);
  // } else if (win.appConfig && win.appConfig.FILE_ENDPOINT) {
  //   FILE_ENDPOINT = win.appConfig.FILE_ENDPOINT;
  //   console.log('Found FILE_ENDPOINT in window.appConfig:', FILE_ENDPOINT);
  // }

  // // Check if we have a valid endpoint
  // if (!FILE_ENDPOINT) {
  //   console.error(
  //     'No FILE_ENDPOINT found. Please configure the FILE_ENDPOINT in your application config.'
  //   );
  //   alert(
  //     'SR file upload failed: Server endpoint not configured. Please contact your administrator.'
  //   );
  //   return Promise.reject(new Error('No FILE_ENDPOINT configured'));
  // }

  // Create URL with eventidentifier parameter if it exists
  const uploadUrl = eventIdentifier
    ? `${FILE_ENDPOINT}?eventidentifier=${encodeURIComponent(eventIdentifier)}`
    : FILE_ENDPOINT;

  console.log('Using upload URL with eventidentifier:', uploadUrl);

  // Generate the SR dataset and convert to blob
  const srDataset = _generateReport(measurementData, additionalFindingTypes, options);
  console.log('SR dataset:', srDataset);
  console.log('SR dataset as JSON:', JSON.stringify(srDataset, null, 2));
  const reportBlob = dcmjs.data.datasetToBlob(srDataset);

  // Create FormData and append the file
  const formData = new FormData();
  formData.append('file', reportBlob, `SR_Report_${new Date().toISOString()}.dcm`);

  // Post the data to the API endpoint
  return fetch(uploadUrl, {
    method: 'POST',
    body: formData,
    headers: {
      Accept: 'application/json',
    },
  })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('SR file uploaded successfully:', data);
      return data;
    })
    .catch(error => {
      console.error('Error uploading SR file:', error);
      throw error;
    });
}
