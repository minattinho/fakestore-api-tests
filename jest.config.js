module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.spec.ts'],
  verbose: true,
  testTimeout: 30000,
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './output',
        filename: 'report.html',
        pageTitle: 'Platzi Fake Store API - Testes de Integração',
        logoImgPath: './assets/jest-logo.png',
        expand: false,
        openReport: false
      }
    ]
  ]
};
