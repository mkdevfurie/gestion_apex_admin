import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Shell } from './layout/shell';

const tick = () => new Promise((r) => setTimeout(r));

describe('Shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('affiche la navigation et le statut OK quand la base répond', async () => {
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    await tick(); // timer(0) du polling
    TestBed.inject(HttpTestingController)
      .expectOne('/api/health')
      .flush({ status: 'ok', database: 'up', time: '' });
    await fixture.whenStable();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('nav a').length).toBe(8);
    expect(el.textContent).toContain('API & base OK');
  });

  it("signale une API injoignable", async () => {
    const fixture = TestBed.createComponent(Shell);
    fixture.detectChanges();
    await tick(); // timer(0) du polling
    TestBed.inject(HttpTestingController)
      .expectOne('/api/health')
      .flush(null, { status: 502, statusText: 'Bad Gateway' });
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('API injoignable');
  });
});
