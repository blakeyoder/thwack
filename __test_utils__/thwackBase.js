import thwack from '../src';
import ThwackResponse from '../src/ThwackResponse';
import {
  createMockFetch,
  fooBarData,
  defaultFetchOptions,
  defaultHeaders,
} from './jestUtils';

const run = async () => {
  describe('Thwack base', () => {
    it('returns a promise', () => {
      const fetch = createMockFetch();
      const fn = thwack('http://foo.com/', { fetch });
      expect(fn instanceof Promise).toBe(true);
    });
    it('thwack(options) resolves with a ThwackResponse object', async () => {
      const fetch = createMockFetch();
      const options = {
        url: 'http://foo.com/',
        fetch,
        foo: 'bar',
      };
      const data = await thwack(options);
      expect(data instanceof ThwackResponse).toBe(true);
    });
    it('thwack(url, options) resolves with a ThwackResponse object', async () => {
      const fetch = createMockFetch();
      const options = {
        url: 'http://foo.com/',
        fetch,
        foo: 'bar',
      };
      const data = await thwack(options);
      expect(fetch).toBeCalledWith('http://foo.com/', defaultFetchOptions);
      expect(data instanceof ThwackResponse).toBe(true);
    });
    it('can be passed a fully qualified URL', async () => {
      const fetch = createMockFetch();
      await thwack('http://donavon.com/', { fetch });
      expect(fetch).toBeCalledWith('http://donavon.com/', {
        headers: defaultHeaders,
      });
    });
    it('can be passed a URL with params in the URL (ex: "/order/:id")', async () => {
      const fetch = createMockFetch();
      await thwack('http://donavon.com/foo/:id', {
        fetch,
        params: { id: 123 },
      });
      expect(fetch).toBeCalledWith('http://donavon.com/foo/123', {
        headers: defaultHeaders,
      });
    });
    it('can be passed a URL with params which build them as a search query', async () => {
      const fetch = createMockFetch();
      await thwack('http://donavon.com/foo', { fetch, params: { id: 123 } });
      expect(fetch).toBeCalledWith('http://donavon.com/foo?id=123', {
        headers: defaultHeaders,
      });
    });
    it('can be passed a URL with an existing search query (ex: "/order?a=456")', async () => {
      const fetch = createMockFetch();
      await thwack('http://donavon.com/foo?a=456', {
        fetch,
        params: { id: 123 },
      });
      expect(fetch).toBeCalledWith('http://donavon.com/foo?a=456&id=123', {
        headers: defaultHeaders,
      });
    });
    it('sorts param keys when building search query', async () => {
      const fetch = createMockFetch();
      await thwack('http://donavon.com/foo?foo=foo', {
        fetch,
        params: { b: 'b', c: 'c', a: 'a' },
      });
      expect(fetch).toBeCalledWith(
        'http://donavon.com/foo?foo=foo&a=a&b=b&c=c',
        {
          headers: defaultHeaders,
        }
      );
    });
    it('defaults to POST is data is present and method not specified', async () => {
      const fetch = createMockFetch();
      await thwack('http://foo.com/', {
        method: 'foo',
        fetch,
        data: fooBarData,
      });
      expect(fetch).toBeCalledWith('http://foo.com/', {
        headers: { 'content-type': 'application/json', ...defaultHeaders },
        body: JSON.stringify(fooBarData),
        method: 'foo',
      });
      await thwack('http://foo.com/', { fetch, data: fooBarData });
      expect(fetch).toBeCalledWith('http://foo.com/', {
        headers: { 'content-type': 'application/json', ...defaultHeaders },
        body: JSON.stringify(fooBarData),
        method: 'post',
      });
    });
    it('encode only if content-type is application/json', async () => {
      const fetch = createMockFetch();
      await thwack('http://foo.com/', {
        fetch,
        headers: { 'content-type': 'text/plain' },
        data: 'this is plain text',
      });
      expect(fetch).toBeCalledWith('http://foo.com/', {
        headers: { 'content-type': 'text/plain', ...defaultHeaders },
        body: 'this is plain text',
        method: 'post',
      });
      await thwack('http://foo.com/', {
        fetch,
        headers: { 'content-type': 'application/json' },
        data: fooBarData,
      });
      expect(fetch).toBeCalledWith('http://foo.com/', {
        headers: { 'content-type': 'application/json', ...defaultHeaders },
        body: JSON.stringify(fooBarData),
        method: 'post',
      });
    });

    it('does not override method (if specified) when data present', async () => {
      const fetch = createMockFetch();
      await thwack('http://foo.com/', {
        fetch,
        headers: { 'content-type': 'text/plain' },
        data: 'this is plain text',
        method: 'FOO',
      });
      expect(fetch).toBeCalledWith('http://foo.com/', {
        headers: { 'content-type': 'text/plain', ...defaultHeaders },
        body: 'this is plain text',
        method: 'FOO',
      });
    });

    describe('when response does not specify a content-type', () => {
      it('defaults to text parsing', async () => {
        const fetch = createMockFetch();
        // patch mock fetch to not return any headers
        fetch.response.headers = {
          entries: () => [],
        };
        const { data } = await thwack('http://foo.com/', { fetch });
        expect(data).toEqual('text');
      });
    });

    describe('when response is application/json', () => {
      it('resolves with a parsed JSON object', async () => {
        const fetch = createMockFetch();
        const { data } = await thwack('http://foo.com/', { fetch });
        expect(data).toEqual(fooBarData);
      });
      it('resolves with a text if options.responseParserMap says it should use "text"', async () => {
        const fetch = createMockFetch();
        const { data } = await thwack('http://foo.com/', {
          fetch,
          responseParserMap: { 'application/json': 'text' },
        });
        expect(data).toEqual('text');
      });
      it('resolves with a text if responseType = "text"', async () => {
        const fetch = createMockFetch();
        const { data } = await thwack('http://foo.com/', {
          fetch,
          responseType: 'text',
        });
        expect(data).toEqual('text');
      });
      it('resolves with a stream if responseType = "stream"', async () => {
        const fetch = createMockFetch();
        const { data } = await thwack('http://foo.com/', {
          fetch,
          responseType: 'stream',
        });
        expect(data).toEqual('(stream)');
      });
    });
    describe('when response is application/json; charset=utf-8', () => {
      it('resolves with a parsed JSON object', async () => {
        const fetch = createMockFetch({
          contentType: 'application/json; charset=utf-8',
        });
        const { data } = await thwack('http://foo.com/', { fetch });
        expect(data).toEqual(fooBarData);
      });
    });

    describe('when response is NOT application/json', () => {
      it('resolves with the body text as a string', async () => {
        const fetch = createMockFetch({
          contentType: '',
          textResult: 'footext',
        });
        const { data } = await thwack('http://foo.com/', { fetch });
        expect(data).toBe('footext');
      });
    });

    describe('when the fetch returns an non-2xx status', () => {
      it('throws a ThwackResponseError', async (done) => {
        const fetch = createMockFetch({ status: 400, textResult: 'footext' });
        try {
          await thwack('http://foo.com/', { fetch });
        } catch (ex) {
          expect(ex instanceof thwack.ThwackResponseError).toBe(true);
          done(null, ex);
        }
      });
      it('throws a ThwackResponseError with message set to the error status', async () => {
        const fetch = createMockFetch({
          status: 404,
          textResult: 'footext',
        });
        await expect(thwack('http://foo.com/', { fetch })).rejects.toThrow(
          'Status 404'
        );
      });
      it('throws a ThwackResponseError with error.status', async (done) => {
        const fetch = createMockFetch({ status: 400, textResult: 'footext' });
        try {
          await thwack('http://foo.com/', { fetch });
        } catch (ex) {
          expect(ex.thwackResponse.status).toBe(400);
          expect(ex.thwackResponse.ok).toBe(false);
          done(null, ex);
        }
      });
      it('throws a ThwackResponseError with error.statusText', async (done) => {
        const fetch = createMockFetch({ status: 403, textResult: 'footext' });
        try {
          await thwack('http://foo.com/', { fetch });
        } catch (ex) {
          expect(ex.thwackResponse.statusText).toBe('ok');
          done(null, ex);
        }
      });
      it('throws a ThwackResponseError with error.headers', async (done) => {
        const fetch = createMockFetch({ status: 403, textResult: 'footext' });
        try {
          await thwack('http://foo.com/', { fetch });
        } catch (ex) {
          expect(ex.thwackResponse.headers).toEqual({
            'content-type': 'application/json',
          });
          done(null, ex);
        }
      });
      it('throws a ThwackResponseError with error.response', async (done) => {
        const fetch = createMockFetch({ status: 403, textResult: 'footext' });
        try {
          await thwack('http://foo.com/', { fetch });
        } catch (ex) {
          expect(typeof ex.thwackResponse.response).toBe('object');
          done(null, ex);
        }
      });
    });

    describe('thwack convenience functions', () => {
      // eslint-disable-next-line no-restricted-syntax
      for (const method of ['post', 'put', 'patch']) {
        it(`thwack.${method}(name, data, options) defaults to ${method.toUpperCase()} and resolves with a ThwackResponse object`, async () => {
          const fetch = createMockFetch();
          const data = await thwack[method]('http://foo.com/', 'data', {
            fetch,
          });
          expect(fetch).toBeCalledWith('http://foo.com/', {
            headers: { 'content-type': 'application/json', ...defaultHeaders },
            body: JSON.stringify('data'),
            method,
          });
          expect(data instanceof ThwackResponse).toBe(true);
        });
      }

      // eslint-disable-next-line no-restricted-syntax
      for (const method of ['get', 'delete', 'head']) {
        it(`thwack.${method}(name, options) defaults to ${method.toUpperCase()} and resolves with a ThwackResponse object`, async () => {
          const fetch = createMockFetch();
          const data = await thwack[method]('http://foo.com/', { fetch });
          expect(fetch).toBeCalledWith('http://foo.com/', {
            headers: defaultHeaders,
            method,
          });
          expect(data instanceof ThwackResponse).toBe(true);
        });
      }

      it('thwack.request(options) resolves with a ThwackResponse object', async () => {
        const fetch = createMockFetch();
        const options = {
          url: 'http://foo.com/',
          fetch,
          foo: 'bar',
        };
        const data = await thwack.request(options);
        expect(fetch).toBeCalledWith('http://foo.com/', defaultFetchOptions);
        expect(data instanceof ThwackResponse).toBe(true);
      });
    });

    describe('thwack.create(options)', () => {
      const instance1 = thwack.create({ baseURL: 'http://one.com' });
      const instance2 = thwack.create({ baseURL: 'http://two.com' });

      it('will use the options as defaults in the new instance', async () => {
        const fetch = createMockFetch();
        const options = {
          url: 'foo',
          fetch,
          foo: 'bar',
        };
        await instance1(options);
        expect(fetch).toBeCalledWith('http://one.com/foo', defaultFetchOptions);
      });

      it('will be unique per instance', async () => {
        const fetch = createMockFetch();
        const options = {
          url: 'foo',
          fetch,
          foo: 'bar',
        };
        await instance2(options);
        expect(fetch).toBeCalledWith('http://two.com/foo', defaultFetchOptions);
      });

      it('will not effect the base thwack instance', async () => {
        const fetch = createMockFetch();
        const options = {
          url: 'http://foo.com/',
          fetch,
          foo: 'bar',
        };
        await thwack(options);
        expect(fetch).toBeCalledWith('http://foo.com/', defaultFetchOptions);
      });
    });

    describe('thwack.getUri', () => {
      it('is exposed on the instance', () => {
        expect(thwack.getUri({ url: 'http://foo.com/' })).toBe(
          'http://foo.com/'
        );
      });
      it('works with a fully qualified URL', () => {
        expect(thwack.getUri({ url: 'http://fully-qualified.com/bar' })).toBe(
          'http://fully-qualified.com/bar'
        );
      });
      it('works with a fully qualified URL on a child instance', () => {
        const instance = thwack.create({ baseURL: 'http:/api.example.com' });
        expect(instance.getUri({ url: 'http://fully-qualified.com/bar' })).toBe(
          'http://fully-qualified.com/bar'
        );
      });
      it('works from within an event listener on a parent instance', async () => {
        let eventUrl;
        const instance = thwack.create({
          baseURL: 'https://example.com/api/',
        });
        instance.addEventListener('request', (event) => {
          const { options } = event;
          eventUrl = thwack.getUri(options);
        });
        const fetch = createMockFetch();
        await instance('foo/:id', {
          fetch,
          foo: 'bar',
          params: { id: 123 },
        });
        expect(eventUrl).toBe('https://example.com/api/foo/123');
      });
    });

    describe('thwack.ThwackResponseError', () => {
      it('is exported as an instance of Error', () => {
        expect(new thwack.ThwackResponseError({}) instanceof Error).toBe(true);
      });
    });
  });
};

export default run;
