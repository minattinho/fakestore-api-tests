import pactum from 'pactum';
import { like, eachLike, includes } from 'pactum-matchers';
import { faker } from '@faker-js/faker';
import { StatusCodes } from 'http-status-codes';
import { SimpleReporter } from '../simple-reporter';

describe('Platzi Fake Store API', () => {
  const p = pactum;
  const rep = SimpleReporter;
  const baseUrl = 'https://api.escuelajs.co/api/v1';

  const sufixo = faker.string.alphanumeric(8).toLowerCase();
  const nomeCategoria = `Categoria QA ${sufixo}`;
  const tituloProduto = `${faker.commerce.productName()} ${sufixo}`;
  const precoProduto = faker.number.int({ min: 10, max: 900 });

  const categoriaSchema = {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' },
      slug: { type: 'string' },
      image: { type: 'string' }
    },
    required: ['id', 'name', 'slug', 'image']
  };

  const produtoSchema = {
    type: 'object',
    properties: {
      id: { type: 'number' },
      title: { type: 'string' },
      slug: { type: 'string' },
      price: { type: 'number' },
      description: { type: 'string' },
      category: categoriaSchema,
      images: { type: 'array', items: { type: 'string' } }
    },
    required: ['id', 'title', 'price', 'description', 'category', 'images']
  };

  p.request.setBaseUrl(baseUrl);
  p.request.setDefaultTimeout(30000);

  beforeAll(async () => {
    p.reporter.add(rep);

    await p
      .spec()
      .post('/categories')
      .withJson({
        name: nomeCategoria,
        image: 'https://placehold.co/600x400'
      })
      .expectStatus(StatusCodes.CREATED)
      .stores('categoriaId', 'id');
  });

  afterAll(async () => {
    await p
      .spec()
      .delete('/categories/{id}')
      .withPathParams('id', '$S{categoriaId}');

    p.reporter.end();
  });

  describe('Categorias', () => {
    it('lista as categorias cadastradas', async () => {
      await p
        .spec()
        .get('/categories')
        .expectStatus(StatusCodes.OK)
        .expectHeaderContains('content-type', 'application/json')
        .expectJsonSchema({ type: 'array', items: categoriaSchema })
        .expectJsonMatch(
          eachLike({
            id: like(1),
            name: like('Clothes'),
            slug: like('clothes')
          })
        );
    });

    it('busca a categoria criada pelo id', async () => {
      await p
        .spec()
        .get('/categories/{id}')
        .withPathParams('id', '$S{categoriaId}')
        .expectStatus(StatusCodes.OK)
        .expectJsonSchema(categoriaSchema)
        .expectJsonLike({ name: nomeCategoria });
    });

    it('altera o nome da categoria', async () => {
      const novoNome = `${nomeCategoria} editada`;

      await p
        .spec()
        .put('/categories/{id}')
        .withPathParams('id', '$S{categoriaId}')
        .withJson({ name: novoNome })
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          id: '$S{categoriaId}',
          name: novoNome,
          slug: `categoria-qa-${sufixo}-editada`
        });
    });

    it('não cadastra categoria sem nome e imagem', async () => {
      await p
        .spec()
        .post('/categories')
        .withJson({ name: '' })
        .expectStatus(StatusCodes.BAD_REQUEST)
        .expectJsonMatch({
          statusCode: StatusCodes.BAD_REQUEST,
          message: includes('name should not be empty')
        })
        .expectJsonLike({
          message: ['image should not be empty']
        });
    });
  });

  describe('Produtos', () => {
    it('cadastra um produto na categoria criada', async () => {
      await p
        .spec()
        .post('/products')
        .withJson({
          title: tituloProduto,
          price: precoProduto,
          description: faker.commerce.productDescription(),
          categoryId: '$S{categoriaId}',
          images: ['https://placehold.co/600x400']
        })
        .expectStatus(StatusCodes.CREATED)
        .expectJsonSchema(produtoSchema)
        .expectJsonLike({
          title: tituloProduto,
          price: precoProduto,
          category: { id: '$S{categoriaId}' }
        })
        .stores('produtoId', 'id');
    });

    it('busca o produto criado pelo id', async () => {
      await p
        .spec()
        .get('/products/{id}')
        .withPathParams('id', '$S{produtoId}')
        .expectStatus(StatusCodes.OK)
        .expectJsonSchema(produtoSchema)
        .expectJsonLike({
          id: '$S{produtoId}',
          title: tituloProduto
        });
    });

    it('pagina a listagem de produtos com offset e limit', async () => {
      await p
        .spec()
        .get('/products')
        .withQueryParams({ offset: 0, limit: 5 })
        .expectStatus(StatusCodes.OK)
        .expectJsonLength(5)
        .expectJsonSchema({ type: 'array', items: produtoSchema });
    });

    it('filtra os produtos pela categoria', async () => {
      await p
        .spec()
        .get('/products/')
        .withQueryParams('categoryId', '$S{categoriaId}')
        .expectStatus(StatusCodes.OK)
        .expectJsonLength(1)
        .expectJsonLike([{ id: '$S{produtoId}', title: tituloProduto }]);
    });

    it('remove o produto e ele deixa de existir', async () => {
      await p
        .spec()
        .delete('/products/{id}')
        .withPathParams('id', '$S{produtoId}')
        .expectStatus(StatusCodes.OK)
        .expectBody('true');

      await p
        .spec()
        .get('/products/{id}')
        .withPathParams('id', '$S{produtoId}')
        .expectStatus(StatusCodes.BAD_REQUEST)
        .expectJsonLike({ name: 'EntityNotFoundError' });
    });
  });

  describe('Usuários', () => {
    const usuario = {
      name: faker.person.fullName(),
      email: `qa.${sufixo}@mail.com`,
      password: faker.internet.password({ length: 10 }),
      avatar: 'https://placehold.co/600x400'
    };

    it('cadastra um novo usuário', async () => {
      await p
        .spec()
        .post('/users/')
        .withJson(usuario)
        .expectStatus(StatusCodes.CREATED)
        .expectJsonLike({
          name: usuario.name,
          email: usuario.email,
          role: 'customer'
        })
        .expectJsonMatch({ id: like(1) })
        .stores('usuarioId', 'id');
    });

    it('informa que o e-mail cadastrado não está mais disponível', async () => {
      await p
        .spec()
        .post('/users/is-available')
        .withJson({ email: usuario.email })
        .expectStatus(StatusCodes.CREATED)
        .expectJson({ isAvailable: false });
    });

    it('não cadastra usuário com dados inválidos', async () => {
      await p
        .spec()
        .post('/users/')
        .withJson({
          name: usuario.name,
          email: 'email-invalido',
          password: '123',
          avatar: 'sem-url'
        })
        .expectStatus(StatusCodes.BAD_REQUEST)
        .expectJsonLike({
          message: [
            'email must be an email',
            'password must be longer than or equal to 4 characters',
            'avatar must be a URL address'
          ]
        });
    });

    it('atualiza o nome do usuário', async () => {
      const novoNome = faker.person.fullName();

      await p
        .spec()
        .put('/users/{id}')
        .withPathParams('id', '$S{usuarioId}')
        .withJson({ name: novoNome })
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          id: '$S{usuarioId}',
          name: novoNome,
          email: usuario.email
        });
    });

    it('remove o usuário e ele deixa de existir', async () => {
      await p
        .spec()
        .delete('/users/{id}')
        .withPathParams('id', '$S{usuarioId}')
        .expectStatus(StatusCodes.OK)
        .expectBody('true');

      await p
        .spec()
        .get('/users/{id}')
        .withPathParams('id', '$S{usuarioId}')
        .expectStatus(StatusCodes.BAD_REQUEST)
        .expectJsonLike({ name: 'EntityNotFoundError' });
    });
  });
});
