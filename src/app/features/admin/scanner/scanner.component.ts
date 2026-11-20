import {
  AfterViewInit, Component, ElementRef, HostListener, InjectionToken, OnDestroy, ViewChild, inject, signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';
import jsQR from 'jsqr';
import { AdminService } from '../../../core/services/admin.service';
import { CheckInSearchResult, CheckInTicketDetails, ScanResult } from '../../../core/models/admin.models';
import { parseQrRegistrationCode } from './qr-payload';

export type CameraState = 'idle' | 'starting' | 'scanning' | 'detected' | 'error';

export const QR_READER_FACTORY = new InjectionToken<() => BrowserQRCodeReader>('QR_READER_FACTORY', {
  providedIn: 'root',
  factory: () => () => {
    const hints = new Map<DecodeHintType, unknown>();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    return new BrowserQRCodeReader(hints, {
      delayBetweenScanAttempts: 250,
      delayBetweenScanSuccess: 1000,
      tryPlayVideoTimeout: 10000
    });
  }
});

@Component({
  selector: 'app-scanner', standalone: true, imports: [CommonModule, FormsModule],
  templateUrl: './scanner.component.html', styleUrl: './scanner.component.scss'
})
export class ScannerComponent implements AfterViewInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly createReader = inject(QR_READER_FACTORY);
  @ViewChild('cameraVideo') private cameraVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild('modalHeading') private modalHeading?: ElementRef<HTMLElement>;

  private scannerReader: BrowserQRCodeReader | null = null;
  private scannerControls: IScannerControls | null = null;
  private activeMediaStream: MediaStream | null = null;
  private fallbackTimer: ReturnType<typeof setInterval> | null = null;
  private fallbackCanvas: HTMLCanvasElement | null = null;
  private fallbackBusy = false;
  private lastFocusedElement: HTMLElement | null = null;
  private destroyed = false;
  private activeCredential = '';

  manualCode = '';
  attendeeQuery = '';
  readonly cameraState = signal<CameraState>('idle');
  readonly cameraMessage = signal('Select Start camera when you are ready to scan a ticket.');
  readonly decodeAttempts = signal(0);
  readonly fallbackAttempts = signal(0);
  readonly lookupLoading = signal(false);
  readonly confirmationLoading = signal(false);
  readonly assigningSeat = signal(false);
  readonly modalOpen = signal(false);
  readonly modalError = signal<string | null>(null);
  readonly details = signal<CheckInTicketDetails | null>(null);
  readonly checkInResult = signal<ScanResult | null>(null);
  readonly matches = signal<CheckInSearchResult[]>([]);
  readonly searchLoading = signal(false);

  ngAfterViewInit(): void { /* Camera access is intentionally user initiated. */ }
  ngOnDestroy(): void { this.destroyed = true; this.stopCamera('idle', 'Camera stopped.'); }

  async startCamera(): Promise<void> {
    if (this.cameraState() === 'starting' || this.cameraState() === 'scanning') return;
    if (!this.isSecureCameraContext()) { this.setCameraError('Camera access requires HTTPS or localhost.'); return; }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.setCameraError('This browser does not support camera scanning. Use the manual ticket-number lookup.'); return;
    }
    const video = this.cameraVideo?.nativeElement;
    if (!video) { this.setCameraError('The camera preview is unavailable. Reload the page and try again.'); return; }

    this.stopCamera('idle', 'Preparing camera...');
    this.cameraState.set('starting');
    this.cameraMessage.set('Requesting access to the rear camera...');
    this.scannerReader ??= this.createReader();
    this.decodeAttempts.set(0);
    this.fallbackAttempts.set(0);
    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        frameRate: { ideal: 30, max: 30 }
      }
    };

    try {
      this.cameraState.set('scanning');
      this.cameraMessage.set('Camera active. Hold the ticket QR code inside the frame.');
      const controls = await this.scannerReader.decodeFromConstraints(constraints, video, result => {
        if (this.cameraState() !== 'scanning') return;
        this.decodeAttempts.update(value => value + 1);
        if (!result) return;
        this.handleDetectedPayload(result.getText());
      });
      if (this.destroyed || this.cameraState() !== 'scanning') {
        controls.stop(); this.stopVideoTracks(video); return;
      }
      this.scannerControls = controls;
      this.activeMediaStream = video.srcObject instanceof MediaStream ? video.srcObject : null;
      await this.configureCameraTrack(this.activeMediaStream);
      this.startFallbackDecoder(video);
      const settings = this.activeMediaStream?.getVideoTracks()[0]?.getSettings();
      const dimensions = settings?.width && settings?.height ? ` at ${settings.width}x${settings.height}` : '';
      this.cameraMessage.set(`Camera active${dimensions}. QR frame detection is running.`);
    } catch (error) {
      this.stopCamera('error', this.cameraStartError(error));
    }
  }

  stopCamera(nextState: CameraState = 'idle', message = 'Camera stopped.'): void {
    this.stopFallbackDecoder();
    try { this.scannerControls?.stop(); } catch { /* The browser may already have closed the track. */ }
    this.scannerControls = null;
    const video = this.cameraVideo?.nativeElement;
    const stream = video?.srcObject instanceof MediaStream ? video.srcObject : this.activeMediaStream;
    stream?.getTracks().forEach(track => track.stop());
    this.activeMediaStream = null;
    if (video) video.srcObject = null;
    this.cameraState.set(nextState);
    this.cameraMessage.set(message);
  }

  manualLookup(): void { this.beginLookupFromPayload(this.manualCode, false); }

  async decodeQrImage(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file) return;
    this.cameraMessage.set('Checking the selected image for a QR code...');
    const image = new Image(); const url = URL.createObjectURL(file);
    try {
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(); image.src = url; });
      const result = await (this.scannerReader ??= this.createReader()).decodeFromImageElement(image);
      if (this.cameraState() === 'scanning' || this.cameraState() === 'starting') this.stopCamera('detected', 'QR code found in image.');
      this.beginLookupFromPayload(result.getText(), true);
    } catch {
      this.cameraMessage.set('No readable QR code was found in that image. Try a sharper, well-lit image.');
    } finally { URL.revokeObjectURL(url); }
  }

  confirmCheckIn(): void {
    const ticket = this.details();
    if (!ticket?.canCheckIn || !ticket.seatLabel || this.confirmationLoading()) return;
    this.confirmationLoading.set(true); this.modalError.set(null);
    this.admin.scan(ticket.ticketCode ?? this.activeCredential).subscribe({
      next: result => {
        this.confirmationLoading.set(false); this.checkInResult.set(result);
        const attended = result.admitted || result.decision === 'already_used';
        this.details.update(current => current ? {
          ...current, status: attended ? 'CheckedIn' : current.status,
          checkedInAt: result.checkedInAt ?? (result.admitted ? new Date().toISOString() : current.checkedInAt),
          canCheckIn: !attended
        } : current);
        if (!result.admitted) this.modalError.set(result.message);
      },
      error: error => { this.confirmationLoading.set(false); this.modalError.set(checkInErrorMessage(error, 'Check-in could not be completed.')); }
    });
  }

  assignSeat(): void {
    const ticket = this.details();
    if (!ticket?.ticketId || this.assigningSeat()) return;
    this.assigningSeat.set(true); this.modalError.set(null);
    this.admin.assignCheckInSeat(ticket.ticketId).subscribe({
      next: updated => { this.assigningSeat.set(false); this.details.set(updated); },
      error: error => { this.assigningSeat.set(false); this.modalError.set(checkInErrorMessage(error, 'No seat could be assigned.')); }
    });
  }

  closeModal(): void {
    if (this.confirmationLoading()) return;
    this.modalOpen.set(false); this.lookupLoading.set(false); this.details.set(null); this.checkInResult.set(null);
    this.modalError.set(null); this.cameraState.set('idle');
    this.cameraMessage.set('Select Start camera when you are ready to scan a ticket.');
    const target = this.lastFocusedElement; this.lastFocusedElement = null;
    setTimeout(() => target?.focus());
  }

  scanNext(): void { this.manualCode = ''; this.closeModal(); }

  searchAttendees(): void {
    const query = this.attendeeQuery.trim();
    if (!query || this.searchLoading()) return;
    this.searchLoading.set(true);
    this.admin.checkInSearch(query).subscribe({
      next: matches => { this.matches.set(matches); this.searchLoading.set(false); },
      error: () => { this.matches.set([]); this.searchLoading.set(false); }
    });
  }

  reviewSearchResult(ticket: CheckInSearchResult): void { this.beginLookupFromPayload(ticket.ticketCode, false); }
  @HostListener('document:keydown.escape')
  handleEscape(): void { if (this.modalOpen() && !this.confirmationLoading()) this.closeModal(); }

  private handleDetectedPayload(payload: string): void {
    if (this.cameraState() !== 'scanning') return;
    this.cameraState.set('detected');
    this.stopCamera('detected', 'QR code detected. Looking up the ticket...');
    this.beginLookupFromPayload(payload, true);
  }

  private beginLookupFromPayload(payload: string, cameraDetection: boolean): void {
    if (this.lookupLoading() || this.confirmationLoading()) return;
    const credential = parseQrRegistrationCode(payload);
    if (!credential) {
      if (cameraDetection) this.stopCamera('error', 'The QR code did not contain a usable ticket number.');
      this.details.set(null); this.checkInResult.set(null); this.openModal();
      this.modalError.set('The QR code or manual value does not contain a usable ticket number.'); return;
    }
    if (!cameraDetection && (this.cameraState() === 'scanning' || this.cameraState() === 'starting')) {
      this.stopCamera('detected', 'Manual lookup started. Camera stopped.');
    }
    this.activeCredential = credential; this.manualCode = credential; this.lookupTicket(credential);
  }

  private lookupTicket(credential: string): void {
    this.openModal(); this.lookupLoading.set(true); this.modalError.set(null); this.details.set(null);
    this.checkInResult.set(null);
    this.admin.prepareCheckIn(credential).subscribe({
      next: ticket => {
        this.lookupLoading.set(false);
        if (!ticket.found) { this.modalError.set(ticket.message || 'No matching attendee registration was found.'); return; }
        this.details.set(ticket);
      },
      error: error => { this.lookupLoading.set(false); this.modalError.set(checkInErrorMessage(error, 'Ticket lookup failed. Please try again.')); }
    });
  }

  private openModal(): void {
    if (!this.modalOpen()) this.lastFocusedElement = document.activeElement as HTMLElement | null;
    this.modalOpen.set(true); setTimeout(() => this.modalHeading?.nativeElement.focus());
  }

  private stopVideoTracks(video: HTMLVideoElement): void {
    if (video.srcObject instanceof MediaStream) { video.srcObject.getTracks().forEach(track => track.stop()); video.srcObject = null; }
  }

  private async configureCameraTrack(stream: MediaStream | null): Promise<void> {
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    try {
      const capabilities = track.getCapabilities() as MediaTrackCapabilities & { focusMode?: string[] };
      if (capabilities.focusMode?.includes('continuous')) {
        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as unknown as MediaTrackConstraints);
      }
    } catch { /* Focus constraints are optional and vary by mobile browser. */ }
  }

  private startFallbackDecoder(video: HTMLVideoElement): void {
    this.stopFallbackDecoder();
    this.fallbackCanvas = document.createElement('canvas');
    this.fallbackTimer = setInterval(() => this.decodeFallbackFrame(video), 350);
  }

  private stopFallbackDecoder(): void {
    if (this.fallbackTimer) clearInterval(this.fallbackTimer);
    this.fallbackTimer = null; this.fallbackCanvas = null; this.fallbackBusy = false;
  }

  private decodeFallbackFrame(video: HTMLVideoElement): void {
    if (this.fallbackBusy || this.cameraState() !== 'scanning' || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth) return;
    const canvas = this.fallbackCanvas; if (!canvas) return;
    this.fallbackBusy = true;
    try {
      const width = Math.min(video.videoWidth, 960);
      const height = Math.round(video.videoHeight * (width / video.videoWidth));
      canvas.width = width; canvas.height = height;
      const context = canvas.getContext('2d', { willReadFrequently: true }); if (!context) return;
      context.drawImage(video, 0, 0, width, height);
      const frame = context.getImageData(0, 0, width, height);
      this.fallbackAttempts.update(value => value + 1);
      const result = jsQR(frame.data, width, height, { inversionAttempts: 'attemptBoth' });
      if (result?.data && this.cameraState() === 'scanning') this.handleDetectedPayload(result.data);
    } catch { /* A transient frame read must not stop the primary ZXing scanner. */ }
    finally { this.fallbackBusy = false; }
  }

  private isSecureCameraContext(): boolean {
    return window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  }

  private setCameraError(message: string): void { this.stopCamera('error', message); }

  private cameraStartError(error: unknown): string {
    const name = typeof error === 'object' && error && 'name' in error ? String(error.name) : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera permission was denied. Allow access in your browser settings and try again.';
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'No camera was found on this device.';
    if (name === 'NotReadableError' || name === 'TrackStartError') return 'The camera is already in use or could not be started.';
    return 'The camera could not be started. Use manual lookup or try another browser.';
  }
}

export function checkInErrorMessage(error: unknown, fallback: string): string {
  const response = error as HttpErrorResponse; const body = response?.error;
  const message = stringProperty(body, 'message'); if (message) return message;
  const detail = stringProperty(body, 'detail'); if (detail) return detail;
  const validation = firstValidationError(body?.errors); if (validation) return validation;
  const title = stringProperty(body, 'title'); if (title) return title;
  if (response?.status === 0) return 'The check-in service could not be reached. Check the network connection and try again.';
  if (response?.status === 400) return 'The ticket number or QR code is invalid.';
  if (response?.status === 401) return 'Your session has expired. Sign in again to continue.';
  if (response?.status === 403) return 'You do not have permission to check in attendees.';
  if (response?.status === 404) return 'No matching attendee registration was found.';
  if (response?.status === 409) return 'This attendee has already been checked in or the ticket state has changed.';
  if (response?.status >= 500) return 'The check-in service is temporarily unavailable.';
  return fallback;
}

function stringProperty(value: unknown, property: string): string | null {
  if (typeof value !== 'object' || value === null) return null;
  const item = (value as Record<string, unknown>)[property];
  return typeof item === 'string' && item.trim() ? item.trim() : null;
}

function firstValidationError(errors: unknown): string | null {
  if (Array.isArray(errors)) return errors.find(item => typeof item === 'string' && item.trim())?.trim() ?? null;
  if (typeof errors !== 'object' || errors === null) return null;
  for (const value of Object.values(errors)) {
    if (Array.isArray(value)) {
      const message = value.find(item => typeof item === 'string' && item.trim());
      if (typeof message === 'string') return message.trim();
    }
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}
