import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';

export abstract class BaseRepository {
  private readonly _http = inject(HttpClient);

  protected get http(): HttpClient {
    return this._http;
  }
}
