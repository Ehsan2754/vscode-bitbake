/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2023 Savoir-faire Linux. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import { analyzer } from '../tree-sitter/analyzer'
import { generateParser } from '../tree-sitter/parser'
import { onDefinitionHandler } from '../connectionHandlers/onDefinition'
import { FIXTURE_DOCUMENT, DUMMY_URI, FIXTURE_URI } from './fixtures/fixtures'
import path from 'path'
import { bitBakeProjectScannerClient } from '../BitbakeProjectScannerClient'

describe('on definition', () => {
  beforeAll(async () => {
    if (!analyzer.hasParser()) {
      const parser = await generateParser()
      analyzer.initialize(parser)
    }
    analyzer.resetAnalyzedDocuments()
  })

  beforeEach(() => {
    analyzer.resetAnalyzedDocuments()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('provides go-to-definition to directive statement', async () => {
    const parsedBarPath = path.parse(FIXTURE_DOCUMENT.BAR_INC.uri.replace('file://', ''))
    const parsedFooPath = path.parse(FIXTURE_DOCUMENT.FOO_INC.uri.replace('file://', ''))
    const parsedBazPath = path.parse(FIXTURE_DOCUMENT.BAZ_BBCLASS.uri.replace('file://', ''))

    bitBakeProjectScannerClient.bitbakeScanResult = {
      _classes: [
        {
          name: parsedBazPath.name,
          path: parsedBazPath,
          extraInfo: 'layer: core'
        }
      ],
      _includes: [
        {
          name: parsedBarPath.name,
          path: parsedBarPath,
          extraInfo: 'layer: core'
        },
        {
          name: parsedFooPath.name,
          path: parsedFooPath,
          extraInfo: 'layer: core'
        }
      ],
      _layers: [],
      _overrides: [],
      _recipes: [],
      _workspaces: []
    }

    analyzer.analyze({
      uri: FIXTURE_URI.DIRECTIVE,
      document: FIXTURE_DOCUMENT.DIRECTIVE
    })

    const definition = onDefinitionHandler({
      textDocument: {
        uri: FIXTURE_URI.DIRECTIVE
      },
      position: {
        line: 2,
        character: 9
      }
    })

    expect(definition).toEqual(
      expect.arrayContaining([
        {
          uri: FIXTURE_URI.BAZ_BBCLASS,
          range: {
            start: {
              line: 0,
              character: 0
            },
            end: {
              line: 0,
              character: 0
            }
          }
        }
      ])
    )
  })

  it('provides go to definition for variables found in current file and included files', async () => {
    const parsedBazPath = path.parse(FIXTURE_DOCUMENT.BAZ_BBCLASS.uri.replace('file://', ''))
    const parsedFooPath = path.parse(FIXTURE_DOCUMENT.FOO_INC.uri.replace('file://', ''))
    const parsedBarPath = path.parse(FIXTURE_DOCUMENT.BAR_INC.uri.replace('file://', ''))

    bitBakeProjectScannerClient.bitbakeScanResult = {
      _layers: [],
      _overrides: [],
      _classes: [{
        name: parsedBazPath.name,
        path: parsedBazPath,
        extraInfo: 'layer: core'
      }],
      _recipes: [],
      _includes: [
        {
          name: parsedFooPath.name,
          path: parsedFooPath,
          extraInfo: 'layer: core'
        },
        {
          name: parsedBarPath.name,
          path: parsedBarPath,
          extraInfo: 'layer: core'
        }
      ],
      _workspaces: []
    }

    analyzer.analyze({
      uri: DUMMY_URI,
      document: FIXTURE_DOCUMENT.DIRECTIVE
    })

    const result1 = onDefinitionHandler({
      textDocument: {
        uri: DUMMY_URI
      },
      position: {
        line: 4,
        character: 1
      }
    })
    // Go to definition for symbols in variable expansion
    const result2 = onDefinitionHandler({
      textDocument: {
        uri: DUMMY_URI
      },
      position: {
        line: 6,
        character: 11
      }
    })

    if (result1 === null) {
      fail('result1 is null')
    }

    expect(result1).toEqual(result2)
    expect(result1).toEqual(
      expect.arrayContaining([
        { uri: FIXTURE_URI.FOO_INC, range: { start: { line: 1, character: 0 }, end: { line: 1, character: 21 } } },
        { uri: FIXTURE_URI.FOO_INC, range: { start: { line: 2, character: 0 }, end: { line: 2, character: 21 } } }, { uri: FIXTURE_URI.BAR_INC, range: { start: { line: 2, character: 0 }, end: { line: 2, character: 21 } } },
        { uri: DUMMY_URI, range: { start: { line: 4, character: 0 }, end: { line: 4, character: 21 } } },
        { uri: DUMMY_URI, range: { start: { line: 5, character: 0 }, end: { line: 5, character: 28 } } }
      ])
    )
  })

  it('provides go to definition for symbols found in the string content', async () => {
    const parsedHoverPath = path.parse(FIXTURE_DOCUMENT.HOVER.uri.replace('file://', ''))
    const somePackagePath = path.parse(FIXTURE_DOCUMENT.HOVER.uri.replace('file://', '').replace('hover.bb', 'some-package.bb'))
    const somePackagePath2 = path.parse(FIXTURE_DOCUMENT.HOVER.uri.replace('file://', '').replace('hover.bb', 'some-package+1.inc'))
    const somePackagePath3 = path.parse(FIXTURE_DOCUMENT.HOVER.uri.replace('file://', '').replace('hover.bb', 'some-package-2.0.bb'))

    bitBakeProjectScannerClient.bitbakeScanResult._recipes = [
      {
        name: parsedHoverPath.name,
        path: parsedHoverPath,
        appends: [
          {
            root: parsedHoverPath.root,
            dir: parsedHoverPath.dir,
            base: 'hover-append.bbappend',
            ext: 'bbappend',
            name: 'hover-append'
          }
        ],
        extraInfo: 'layer: core'
      },
      {
        name: somePackagePath.name,
        path: somePackagePath,
        extraInfo: 'layer: core'
      },
      {
        name: somePackagePath2.name,
        path: somePackagePath2,
        extraInfo: 'layer: core'
      },
      {
        name: somePackagePath3.name,
        path: somePackagePath3,
        extraInfo: 'layer: core'
      }
    ]

    analyzer.analyze({
      uri: DUMMY_URI,
      document: FIXTURE_DOCUMENT.DIRECTIVE
    })

    const shouldWork1 = onDefinitionHandler({
      textDocument: {
        uri: DUMMY_URI
      },
      position: {
        line: 7,
        character: 21
      }
    })

    const shouldWork2 = onDefinitionHandler({
      textDocument: {
        uri: DUMMY_URI
      },
      position: {
        line: 8,
        character: 22
      }
    })

    const shouldWork3 = onDefinitionHandler({
      textDocument: {
        uri: DUMMY_URI
      },
      position: {
        line: 9,
        character: 14
      }
    })

    const shouldWork4 = onDefinitionHandler({
      textDocument: {
        uri: DUMMY_URI
      },
      position: {
        line: 26,
        character: 20
      }
    })

    const shouldWork5 = onDefinitionHandler({
      textDocument: {
        uri: DUMMY_URI
      },
      position: {
        line: 28,
        character: 42
      }
    })

    const shouldWork6 = onDefinitionHandler({
      textDocument: {
        uri: DUMMY_URI
      },
      position: {
        line: 28,
        character: 65
      }
    })

    const shouldWork7 = onDefinitionHandler({
      textDocument: {
        uri: DUMMY_URI
      },
      position: {
        line: 28,
        character: 78
      }
    })

    const shouldWork8 = onDefinitionHandler({
      textDocument: {
        uri: DUMMY_URI
      },
      position: {
        line: 26,
        character: 33
      }
    })

    const shouldNotWork = onDefinitionHandler({
      textDocument: {
        uri: DUMMY_URI
      },
      position: {
        line: 9,
        character: 31
      }
    })

    expect(shouldWork1).toEqual([
      {
        uri: FIXTURE_URI.HOVER,
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
      },
      { range: { end: { character: 0, line: 0 }, start: { character: 0, line: 0 } }, uri: 'file://' + parsedHoverPath.dir + '/hover-append.bbappend' }
    ])

    expect(shouldWork2).toEqual(shouldWork1)

    expect(shouldWork3).toEqual(shouldWork1)

    expect(shouldWork4).toEqual(
      [{
        uri: 'file://' + somePackagePath.dir + '/some-package.bb',
        range: {
          start: {
            line: 0,
            character: 0
          },
          end: {
            line: 0,
            character: 0
          }
        }
      }]
    )

    expect(shouldWork5).toEqual(shouldWork4)

    expect(shouldWork6).toEqual(shouldWork4)

    expect(shouldWork7).toEqual(
      [{
        uri: 'file://' + somePackagePath2.dir + '/some-package+1.inc',
        range: {
          start: {
            line: 0,
            character: 0
          },
          end: {
            line: 0,
            character: 0
          }
        }
      }]
    )

    expect(shouldWork8).toEqual(
      [{
        uri: 'file://' + somePackagePath3.dir + '/some-package-2.0.bb',
        range: {
          start: {
            line: 0,
            character: 0
          },
          end: {
            line: 0,
            character: 0
          }
        }
      }]
    )

    expect(shouldNotWork).toEqual([])
  })
})
