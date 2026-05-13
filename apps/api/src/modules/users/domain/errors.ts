export class LastAdminError extends Error {
  constructor() {
    super('Cannot modify the last admin');
    this.name = new.target.name;
  }
}
