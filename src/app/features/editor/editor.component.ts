import {Component, OnDestroy, OnInit} from "@angular/core";
import {
  UntypedFormGroup,
  ReactiveFormsModule,
  FormGroup,
  FormControl,
} from "@angular/forms";
import {ActivatedRoute, Router} from "@angular/router";
import {ListErrorsComponent} from "../../shared/list-errors.component";
import {NgForOf} from "@angular/common";
import {ArticlesService} from "../../core/services/articles.service";
import {combineLatest, Observable, Subject} from "rxjs";
import {takeUntil} from "rxjs/operators";
import {UserService} from "../../core/services/user.service";
import {Errors} from "../../core/models/errors.model";

interface ArticleForm {
  title: FormControl<string>;
  description: FormControl<string>;
  body: FormControl<string>;
}

@Component({
  selector: "app-editor-page",
  templateUrl: "./editor.component.html",
  imports: [ListErrorsComponent, ReactiveFormsModule, NgForOf],
  standalone: true,
})
export class EditorComponent implements OnInit, OnDestroy {
  _isCreate: boolean = false;
  tagList: string[] = [];
  articleForm: UntypedFormGroup = new FormGroup<ArticleForm>({
    title: new FormControl("", {nonNullable: true}),
    description: new FormControl("", {nonNullable: true}),
    body: new FormControl("", {nonNullable: true}),
  });
  tagField = new FormControl<string>("", {nonNullable: true});

  errors: Errors | null = null;
  isSubmitting = false;
  destroy$ = new Subject<void>();

  constructor(
    private readonly articleService: ArticlesService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly userService: UserService
  ) {
  }

  ngOnInit() {
    console.log(this.route.snapshot.params["slug"])
    this._isCreate = !this.route.snapshot.params["slug"];
    if (this.route.snapshot.params["slug"]) {
      combineLatest([
        this.articleService.get(this.route.snapshot.params["slug"]),
        this.userService.getCurrentUser(),
      ])
        .pipe(takeUntil(this.destroy$))
        .subscribe(([article, {user}]) => {
          if (user.username === article.author.username) {
            this.tagList = article.tagList;
            this.articleForm.patchValue(article);
          } else {
            void this.router.navigate(["/"]);
          }
        });
    }

  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addTag() {
    // retrieve tag control
    const tag = this.tagField.value;
    // only add tag if it does not exist yet
    if (tag != null && tag.trim() !== "" && this.tagList.indexOf(tag) < 0) {
      this.tagList.push(tag);
    }
    // clear the input
    this.tagField.reset("");
  }

  removeTag(tagName: string): void {
    this.tagList = this.tagList.filter((tag) => tag !== tagName);
  }

  submitForm(): void {
    this.isSubmitting = true;

    // update any single tag
    this.addTag();

    // post the changes
    if (this._isCreate) {
      this.articleService
        .create({
          ...this.articleForm.value,
          tagList: this.tagList,
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (article) => this.router.navigate(["/article/", article.slug]),
          error: (err) => {
            this.errors = err;
            this.isSubmitting = false;
          },
        });
    } else {
      this.articleService
        .update({
          ...this.articleForm.value,
          slug: this.route.snapshot.params["slug"],
          tagList: this.tagList,
        })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (article) => this.router.navigate(["/article/", article.slug]),
          error: (err) => {
            this.errors = err;
            this.isSubmitting = false;
          },
        });
    }

  }
}
