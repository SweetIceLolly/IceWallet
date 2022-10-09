import { Injectable } from "@angular/core";
import { Router } from "@angular/router";
import { HttpErrorResponse, HttpHeaders } from "@angular/common/http";
import { AppStorageController } from "./appstorage.controller";

class TrieNode {
  public children: Map<string, TrieNode> = new Map();
  public isEndOfWord: boolean = false;
  public originalWord: string = '';
}

class Trie {
  private root: TrieNode = new TrieNode();

  public insert(word: string): void {
    let currNode: TrieNode = this.root;

    for (let i = 0; i < word.length; i++) {
      const char: string = word[i].toLowerCase();

      if (!currNode.children.has(char)) {
        currNode.children.set(char, new TrieNode());
      }

      currNode = currNode.children.get(char) as TrieNode;
    }

    currNode.isEndOfWord = true;
    currNode.originalWord = word;
  }

  public getAllChildren(prefix: string): string[] {
    const LIMIT: number = 10;

    let currNode: TrieNode = this.root;
    const words: string[] = [];

    for (let i = 0; i < prefix.length; i++) {
      const char: string = prefix[i];

      if (!currNode.children.has(char)) {
        return [];
      }

      currNode = currNode.children.get(char) as TrieNode;
    }

    this.getAllChildrenHelper(currNode, prefix, words, LIMIT);

    return words;
  }

  private getAllChildrenHelper(currNode: TrieNode, prefix: string, words: string[], limit: number): void {
    if (currNode.isEndOfWord) {
      words.push(currNode.originalWord);
    }

    if (words.length >= limit) {
      return;
    }

    for (const [char, node] of currNode.children) {
      this.getAllChildrenHelper(node, prefix + char, words, limit);
    }
  }
}

@Injectable()
export class GeneralController {
  trie: Trie = new Trie();

  constructor(
    private appStorageCtrl: AppStorageController,
    private router: Router
  ) {}

  updateFooter(newFooter: string): void {
    (document.getElementById('footer-msg') as any).innerHTML = newFooter;
  }

  showLoading(show: boolean) {
    if (show) {
      (document.getElementById('loadingPopup') as any).style.display = 'block';
    } else {
      (document.getElementById('loadingPopup') as any).style.display = 'none';
    }
  }

  getAuthHeader() {
    return {
      headers: new HttpHeaders({
        'Authorization': this.appStorageCtrl.getLoginToken() || ''
      })
    }
  }

  handleError(err: HttpErrorResponse) {
    if (err.status === 401) {
      this.appStorageCtrl.setLoginToken('');
      this.router.navigate(['/login']);
    }
  }

  addDescToTrie(desc: string): void {
    this.trie.insert(desc);
  }

  getDescSuggestions(prefix: string): string[] {
    return this.trie.getAllChildren(prefix);
  }
}
