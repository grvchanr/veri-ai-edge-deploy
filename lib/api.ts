import axios, {
  AxiosInstance,
  AxiosError,
  CancelTokenSource,
} from 'axios';

/* -------------------------------------------------------------------------- */
/* Axios instance                                                             */
/* -------------------------------------------------------------------------- */
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
  timeout: 60000,
  headers: {
    Accept: 'application/json',
  },
});

/* -------------------------------------------------------------------------- */
/* 🔥 GLOBAL NGROK FIX (MOST IMPORTANT PART)                                  */
/* -------------------------------------------------------------------------- */
api.interceptors.request.use((config) => {
  config.headers = config.headers || {};
  config.headers['ngrok-skip-browser-warning'] = 'true';
  return config;
});

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */
export interface ApiError extends Error {
  status?: number;
  originalError: AxiosError;
}

export interface AnalysisResult {
  confidence: number;
  verdict: 'authentic' | 'suspicious' | 'deepfake';
  decision: { label: string; confidence: number };
  reason: string;
  processing_steps: string[];
  metrics: {
    framesAnalyzed?: number;
    processingTime?: number;
    facesDetected?: number;
    modelUsed: string;
    inferenceDevice: string;
  };
  analysis_time_seconds?: number;
  phishing_score?: number;
  faces?: Array<{ bbox: number[]; score: number }>;
}

export interface FrameAnalysisResult {
  confidence: number;
  verdict: 'authentic' | 'suspicious' | 'deepfake';
  decision: { label: string; confidence: number };
  faces: Array<{ bbox: number[]; score: number }>;
  reason?: string;
  metrics: {
    framesAnalyzed?: number;
    processingTime?: number;
    facesDetected?: number;
    modelUsed: string;
    inferenceDevice: string;
  };
}

export interface HealthResponse {
  status: string;
  edgeMode: string;
  inferenceDevice: string;
  latency: number;
  model?: string;
  liveStreamEnabled?: boolean;
}

/* -------------------------------------------------------------------------- */
/* Helper                                                                     */
/* -------------------------------------------------------------------------- */
function createApiError(message: string, err: AxiosError): ApiError {
  const apiError = new Error(message) as ApiError;
  apiError.status = err.response?.status;
  apiError.originalError = err;
  return apiError;
}

/* -------------------------------------------------------------------------- */
/* uploadVideo                                                                */
/* -------------------------------------------------------------------------- */
export async function uploadVideo(
  file: File,
  cancelSource?: CancelTokenSource,
  onProgress?: (pct: number) => void
): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post<AnalysisResult>('/analyze/video', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      cancelToken: cancelSource?.token,
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    });
    return response.data;
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axios.isCancel(axiosErr)) throw createApiError('Video upload cancelled', axiosErr);
    if (axiosErr.code === 'ECONNABORTED') throw createApiError('Video upload timed out', axiosErr);
    throw createApiError('Failed to upload video', axiosErr);
  }
}

/* -------------------------------------------------------------------------- */
/* analyzeText                                                                */
/* -------------------------------------------------------------------------- */
export async function analyzeText(
  text: string,
  cancelSource?: CancelTokenSource
): Promise<AnalysisResult> {
  try {
    const response = await api.post<AnalysisResult>(
      '/analyze/text',
      { text },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        cancelToken: cancelSource?.token,
      }
    );
    return response.data;
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axios.isCancel(axiosErr)) throw createApiError('Text analysis cancelled', axiosErr);
    if (axiosErr.code === 'ECONNABORTED') throw createApiError('Text analysis timed out', axiosErr);
    throw createApiError('Failed to analyze text', axiosErr);
  }
}

/* -------------------------------------------------------------------------- */
/* analyzeTextFile                                                            */
/* -------------------------------------------------------------------------- */
export async function analyzeTextFile(
  file: File,
  cancelSource?: CancelTokenSource
): Promise<AnalysisResult> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const response = await api.post<AnalysisResult>('/analyze/text', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      cancelToken: cancelSource?.token,
    });
    return response.data;
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axios.isCancel(axiosErr)) throw createApiError('Text analysis cancelled', axiosErr);
    throw createApiError('Failed to analyze text file', axiosErr);
  }
}

/* -------------------------------------------------------------------------- */
/* checkHealth                                                                */
/* -------------------------------------------------------------------------- */
export async function checkHealth(
  cancelSource?: CancelTokenSource
): Promise<HealthResponse> {
  try {
    const response = await api.get<HealthResponse>('/health', {
      cancelToken: cancelSource?.token,
    });
    return response.data;
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axios.isCancel(axiosErr)) throw createApiError('Health check cancelled', axiosErr);
    if (axiosErr.code === 'ECONNABORTED') throw createApiError('Health check timed out', axiosErr);
    throw createApiError('Failed to fetch health status', axiosErr);
  }
}

/* -------------------------------------------------------------------------- */
/* analyzeFrame                                                               */
/* -------------------------------------------------------------------------- */
export async function analyzeFrame(
  imageBase64: string
): Promise<FrameAnalysisResult> {
  try {
    const response = await api.post<FrameAnalysisResult>(
      '/analyze/frame',
      { image: imageBase64 },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  } catch (err) {
    const axiosErr = err as AxiosError;
    if (axios.isCancel(axiosErr)) throw createApiError('Frame analysis cancelled', axiosErr);
    throw createApiError('Failed to analyze frame', axiosErr);
  }
}

export default api;