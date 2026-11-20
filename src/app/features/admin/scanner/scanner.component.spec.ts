import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { of, Subject, throwError } from 'rxjs';
import { AdminService } from '../../../core/services/admin.service';
import { CheckInTicketDetails, ScanResult } from '../../../core/models/admin.models';
import { QR_READER_FACTORY, ScannerComponent } from './scanner.component';

describe('ScannerComponent', () => {
  let fixture: ComponentFixture<ScannerComponent>;
  let component: ScannerComponent;
  let admin: jasmine.SpyObj<AdminService>;
  let decodeCallback: ((result?: { getText(): string }) => void) | undefined;
  let controls: jasmine.SpyObj<IScannerControls>;
  let reader: Pick<BrowserQRCodeReader, 'decodeFromConstraints'>;

  const readyTicket: CheckInTicketDetails = {
    found: true, message: 'Ticket is valid and ready for check-in.', ticketId: 'ticket-1',
    ticketCode: 'TKT-ABC123', guestName: 'Ada Guest', guestEmail: 'ada@example.com',
    eventTitle: 'Royal Pass', ticketType: 'Gold', status: 'Active', checkedInAt: null,
    seatLabel: 'A01', canCheckIn: true
  };

  beforeEach(async () => {
    controls = jasmine.createSpyObj<IScannerControls>('controls', ['stop']);
    reader = {
      decodeFromConstraints: jasmine.createSpy('decodeFromConstraints').and.callFake((_constraints, _video, callback) => {
        decodeCallback = callback as unknown as (result?: { getText(): string }) => void;
        return Promise.resolve(controls);
      })
    };
    admin = jasmine.createSpyObj<AdminService>('AdminService', ['prepareCheckIn', 'scan', 'assignCheckInSeat', 'checkInSearch']);
    admin.prepareCheckIn.and.returnValue(of(readyTicket));
    admin.checkInSearch.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [ScannerComponent],
      providers: [
        { provide: AdminService, useValue: admin },
        { provide: QR_READER_FACTORY, useValue: () => reader as BrowserQRCodeReader }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ScannerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('performs only one lookup for repeated detection callbacks', async () => {
    await component.startCamera();
    decodeCallback?.({ getText: () => 'TKT-ABC123' });
    decodeCallback?.({ getText: () => 'TKT-ABC123' });
    expect(admin.prepareCheckIn).toHaveBeenCalledTimes(1);
    expect(component.cameraState()).toBe('detected');
  });

  it('stops scanner controls and every media track', async () => {
    const track = jasmine.createSpyObj<MediaStreamTrack>('track', ['stop']);
    const stream = new MediaStream();
    spyOn(stream, 'getTracks').and.returnValue([track]);
    const video = fixture.nativeElement.querySelector('video') as HTMLVideoElement;
    (video as unknown as { srcObject: MediaStream }).srcObject = stream;
    await component.startCamera();

    component.stopCamera();

    expect(controls.stop).toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalled();
    expect(video.srcObject).toBeNull();
    expect(component.cameraState()).toBe('idle');
  });

  it('shows a successful attendee lookup for review', () => {
    component.manualCode = 'TKT-ABC123';
    component.manualLookup();
    expect(component.details()).toEqual(readyTicket);
    expect(component.modalOpen()).toBeTrue();
  });

  it('shows the 404 not-found fallback', () => {
    admin.prepareCheckIn.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    component.manualCode = 'UNKNOWN';
    component.manualLookup();
    expect(component.modalError()).toBe('No matching attendee registration was found.');
  });

  it('prioritizes the backend message for a 403 response', () => {
    admin.prepareCheckIn.and.returnValue(throwError(() => new HttpErrorResponse({ status: 403, error: { message: 'Gate access is restricted.' } })));
    component.manualCode = 'TKT-ABC123';
    component.manualLookup();
    expect(component.modalError()).toBe('Gate access is restricted.');
  });

  it('presents an already checked-in attendee without confirmation', () => {
    admin.prepareCheckIn.and.returnValue(of({ ...readyTicket, status: 'CheckedIn', checkedInAt: '2026-11-20T10:00:00Z', canCheckIn: false }));
    component.manualCode = 'TKT-ABC123';
    component.manualLookup();
    fixture.detectChanges();
    expect(component.details()?.canCheckIn).toBeFalse();
    expect(fixture.nativeElement.querySelector('.confirm-button')).toBeNull();
  });

  it('updates the attendee after successful confirmation', () => {
    const response: ScanResult = { admitted: true, decision: 'admitted', message: 'Checked in.', ticketId: 'ticket-1',
      ticketCode: 'TKT-ABC123', guestName: 'Ada Guest', eventTitle: 'Royal Pass', ticketType: 'Gold',
      checkedInAt: '2026-11-20T12:00:00Z', seatLabel: 'A01' };
    admin.scan.and.returnValue(of(response));
    component.manualCode = 'TKT-ABC123'; component.manualLookup(); component.confirmCheckIn();
    expect(component.details()?.status).toBe('CheckedIn');
    expect(component.details()?.checkedInAt).toBe(response.checkedInAt);
    expect(component.checkInResult()?.admitted).toBeTrue();
  });

  it('prevents duplicate confirmation submissions', () => {
    const pending = new Subject<ScanResult>();
    admin.scan.and.returnValue(pending);
    component.manualCode = 'TKT-ABC123'; component.manualLookup();
    component.confirmCheckIn(); component.confirmCheckIn();
    expect(admin.scan).toHaveBeenCalledTimes(1);
  });

  it('shows the attendee identity icon', () => {
    component.manualCode = 'TKT-ABC123'; component.manualLookup(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.avatar-fallback')).not.toBeNull();
  });

  it('uses the same payload normalization for manual lookup', () => {
    component.manualCode = '{"registrationCode":"TKT-JSON123"}';
    component.manualLookup();
    expect(admin.prepareCheckIn).toHaveBeenCalledOnceWith('TKT-JSON123');
  });
});
