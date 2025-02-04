import { HTMLIntegration, $imports } from '../html';

describe('HTMLIntegration', () => {
  let fakeHTMLAnchoring;
  let fakeHTMLMetadata;
  let fakeGuessMainContentArea;
  let fakePreserveScrollPosition;
  let fakeScrollElementIntoView;

  beforeEach(() => {
    fakeHTMLAnchoring = {
      anchor: sinon.stub(),
      describe: sinon.stub(),
    };

    fakeHTMLMetadata = {
      getDocumentMetadata: sinon.stub().returns({ title: 'Example site' }),
      uri: sinon.stub().returns('https://example.com/'),
    };

    fakeScrollElementIntoView = sinon.stub().resolves();

    fakeGuessMainContentArea = sinon.stub().returns(null);
    fakePreserveScrollPosition = sinon.stub().yields();

    const HTMLMetadata = sinon.stub().returns(fakeHTMLMetadata);
    $imports.$mock({
      '../anchoring/html': fakeHTMLAnchoring,
      '../util/scroll': {
        scrollElementIntoView: fakeScrollElementIntoView,
      },
      './html-metadata': { HTMLMetadata },
      './html-side-by-side': {
        guessMainContentArea: fakeGuessMainContentArea,
        preserveScrollPosition: fakePreserveScrollPosition,
      },
    });
  });

  afterEach(() => {
    $imports.$restore();
  });

  it('implements `anchor` and `destroy` using HTML anchoring', () => {
    const integration = new HTMLIntegration();
    assert.equal(integration.anchor, fakeHTMLAnchoring.anchor);
    assert.equal(integration.describe, fakeHTMLAnchoring.describe);
  });

  describe('#canAnnotate', () => {
    it('is always true', () => {
      const integration = new HTMLIntegration();
      const range = new Range();
      assert.isTrue(integration.canAnnotate(range));
    });
  });

  describe('#contentContainer', () => {
    it('returns body by default', () => {
      const integration = new HTMLIntegration();
      assert.equal(integration.contentContainer(), document.body);
    });
  });

  describe('#destroy', () => {
    it('does nothing', () => {
      new HTMLIntegration().destroy();
    });
  });

  describe('#fitSideBySide', () => {
    function getMargins() {
      const bodyStyle = document.body.style;
      const leftMargin = bodyStyle.marginLeft
        ? parseInt(bodyStyle.marginLeft)
        : null;
      const rightMargin = bodyStyle.marginRight
        ? parseInt(bodyStyle.marginRight)
        : null;
      return [leftMargin, rightMargin];
    }

    const sidebarWidth = 200;
    const padding = 12;

    // Generate a dummy response for `guessMainContentArea`. This response
    // is what would be returned when the content fills the full width of the
    // viewport, mins space for an open sidebar and some padding.
    //
    // The sidebar space is included because `fitSideBySide` adjusts the margins
    // on the body before calling `guessMainContentArea`.
    function fullWidthContentRect() {
      return new DOMRect(
        0,
        0,
        window.innerWidth - sidebarWidth - padding,
        window.innerHeight
      );
    }

    function createIntegration() {
      const integration = new HTMLIntegration();
      integration.sideBySideEnabled = true;
      return integration;
    }

    beforeEach(() => {
      // By default, pretend that the content fills the page.
      fakeGuessMainContentArea.returns(fullWidthContentRect());
    });

    afterEach(() => {
      // Reset any styles applied by `fitSideBySide`.
      document.body.style.marginLeft = '';
      document.body.style.marginRight = '';
    });

    it('does nothing when disabled', () => {
      new HTMLIntegration().fitSideBySide({});
    });

    context('when enabled', () => {
      it('sets left and right margins on body element when activated', () => {
        const integration = createIntegration();

        integration.fitSideBySide({ expanded: true, width: sidebarWidth });

        assert.deepEqual(getMargins(), [padding, sidebarWidth + padding]);
      });

      it('does not set left and right margins if there is not enough room to enable', () => {
        const integration = createIntegration();

        // Minimum available content width for side-by-side is 480
        // window.innerWidth (800) - 321 = 479 --> too small
        integration.fitSideBySide({ expanded: true, width: 321 });

        assert.deepEqual(getMargins(), [null, null]);
      });

      it('allows sidebar to overlap non-main content on the side of the page', () => {
        const integration = createIntegration();

        const contentRect = fullWidthContentRect();
        // Pretend there is some content to the right of the main content
        // in the document (eg. related stories, ads).
        contentRect.width -= 100;
        fakeGuessMainContentArea.returns(contentRect);

        integration.fitSideBySide({ expanded: true, width: sidebarWidth });

        assert.deepEqual(getMargins(), [padding, sidebarWidth + padding - 100]);
      });

      it('does nothing if the content area cannot be determined', () => {
        const integration = createIntegration();
        fakeGuessMainContentArea.returns(null);

        integration.fitSideBySide({ expanded: true, width: sidebarWidth });

        assert.deepEqual(getMargins(), [null, null]);
      });

      it('saves and restores the scroll position after adjusting margins', () => {
        const integration = createIntegration();

        integration.fitSideBySide({ expanded: true, width: sidebarWidth });

        assert.calledOnce(fakePreserveScrollPosition);
      });

      it('removes margins on body element when side-by-side mode is deactivated', () => {
        const integration = createIntegration();

        integration.fitSideBySide({ expanded: true, width: sidebarWidth });
        assert.notDeepEqual(getMargins(), [null, null]);

        integration.fitSideBySide({ expanded: false });
        assert.deepEqual(getMargins(), [null, null]);
      });

      context('main content area has margin:auto', () => {
        const bodyWidth = 400;
        const autoMargin = Math.floor((window.innerWidth - bodyWidth) / 2);

        function getComputedMargins(element) {
          const leftMargin = Math.floor(
            parseInt(window.getComputedStyle(element).marginLeft, 10)
          );
          const rightMargin = Math.floor(
            parseInt(window.getComputedStyle(element).marginRight, 10)
          );
          return [leftMargin, rightMargin];
        }

        // Add a style node to set a max-width and auto margins on the body
        function appendBodyStyles(document_) {
          const el = document_.createElement('style');
          el.type = 'text/css';
          el.textContent = `body { margin: 0 auto; max-width: ${bodyWidth}px }`;
          el.classList.add('js-style-test');
          document_.body.appendChild(el);
        }

        before(() => {
          appendBodyStyles(document);
        });

        after(() => {
          // Remove test styles
          const elements = document.querySelectorAll('.js-style-test');
          for (let i = 0; i < elements.length; i++) {
            elements[i].remove();
          }
        });

        beforeEach(() => {
          // In these tests, we're treating the body element as the
          // main content area.
          //
          // `guessMainContent` area is called _after_ a right margin is set
          // on the body, so we'll return here the updated computed left and
          // right position of the body to emulate a real-life result
          fakeGuessMainContentArea.callsFake(bodyEl => {
            const margins = getComputedMargins(bodyEl);
            return { left: margins[0], right: window.innerWidth - margins[1] };
          });
        });

        it('should not move the main content to the right', () => {
          const integration = createIntegration();
          // Before enabling side-by-side, the horizontal margins on the body
          // are derived based on `margin: auto` in the stylesheet
          assert.deepEqual(getComputedMargins(document.body), [
            autoMargin,
            autoMargin,
          ]);

          // Will result in a right margin of 112px (100 + 12 padding)
          integration.fitSideBySide({ expanded: true, width: 100 });

          // Without intervention, the left margin would have _increased_ to
          // balance out the remaining space, that is:
          // innerWidth - bodyWidth - 112 > 200
          //
          // To prevent content jumping to the right, implementation sets left
          // margin to original auto margin
          assert.deepEqual(getComputedMargins(document.body), [
            autoMargin,
            112,
          ]);
        });

        it('may move the main content to the left to make room for sidebar', () => {
          const integration = createIntegration();

          // Will result in right margin of 262 (250 + 12 padding)
          integration.fitSideBySide({ expanded: true, width: 250 });

          // The amount of space available to the left of the body is now _less_
          // than the original auto-left-margin. This is fine: let the auto
          // margin re-adjust to the available amount of space (move to the left):
          const updatedMargins = getComputedMargins(document.body);
          const expectedLeftMargin = Math.floor(
            window.innerWidth - bodyWidth - 262
          );
          assert.equal(updatedMargins[0], expectedLeftMargin);
          assert.isBelow(updatedMargins[0], autoMargin);
        });
      });
    });
  });

  describe('#getMetadata', () => {
    it('returns document metadata', async () => {
      const integration = new HTMLIntegration();
      assert.deepEqual(await integration.getMetadata(), {
        title: 'Example site',
      });
    });
  });

  describe('#scrollToAnchor', () => {
    let highlight;

    beforeEach(() => {
      highlight = document.createElement('div');
      document.body.appendChild(highlight);
    });

    afterEach(() => {
      highlight.remove();
    });

    it('scrolls to first highlight of anchor', async () => {
      const anchor = { highlights: [highlight] };

      const integration = new HTMLIntegration();
      await integration.scrollToAnchor(anchor);

      assert.calledOnce(fakeScrollElementIntoView);
      assert.calledWith(fakeScrollElementIntoView, highlight);
    });

    it('does nothing if anchor has no highlights', async () => {
      const anchor = {};

      const integration = new HTMLIntegration();
      await integration.scrollToAnchor(anchor);

      assert.notCalled(fakeScrollElementIntoView);
    });
  });

  describe('#uri', () => {
    it('returns main document URL', async () => {
      const integration = new HTMLIntegration();
      assert.deepEqual(await integration.uri(), 'https://example.com/');
    });
  });
});
