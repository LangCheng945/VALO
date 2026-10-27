"""Run with: python3 -m unittest discover -s tests"""
from html.parser import HTMLParser
from pathlib import Path
import unittest


class Structure(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.stack = []
        self.parents = {}
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        element_id = attrs.get('id')
        if element_id:
            self.parents[element_id] = [item[1] for item in self.stack]
        if tag not in {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
                       'link', 'meta', 'param', 'source', 'track', 'wbr', 'path'}:
            self.stack.append((tag, element_id))

    def handle_endtag(self, tag):
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                del self.stack[i:]
                break


class ArmoryTests(unittest.TestCase):
    def test_every_shop_section_is_contained_in_modal(self):
        html = Path(__file__).resolve().parents[1].joinpath('index.html').read_text()
        tree = Structure(html)
        controls = ['armory-grid', 'agent-card-jett', 'agent-card-phoenix',
                    'mode-tactical', 'mode-strafing', 'mode-stationary',
                    'wpn-card-vandal', 'wpn-card-phantom', 'wpn-card-operator',
                    'wpn-card-classic', 'shield-card-heavy', 'shield-card-light']
        for control in controls:
            with self.subTest(control=control):
                self.assertIn(control, tree.parents)
                self.assertIn('buy-menu-modal', tree.parents.get(control, []))


if __name__ == '__main__':
    unittest.main()
